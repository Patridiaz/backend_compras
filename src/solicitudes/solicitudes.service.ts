import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import OpenAI from "openai";
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { ObservacionArea } from 'src/observaciones/entities/observacion-area.entity';
import { AreaRevisora } from 'src/areas/entities/area.entity';
import { EstadoSolicitud } from 'src/estados/entities/estado-solicitud.entity';
import { CuentaPresupuestaria } from 'src/cuentas/entities/cuenta-presupuestaria.entity';
import * as fs from 'fs';
import { join } from 'path';
import { UpdateSolicitudDto } from './dto/update-solicitud';
import { AssignAreaDto } from './dto/assign-area.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';
import { AssignFinanzasDto } from './dto/assign-finanzas.dto';
import { UpdateFinanzasDto } from './dto/update-finanzas.dto';
import { AssignCompradorDto } from './dto/assign-comprador.dto';
import { UpdateCompradorDto } from './dto/update-comprador.dto';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { Establecimiento } from 'src/establecimientos/entities/establecimiento.entity';
import { Fondo } from 'src/fondos/entities/fondo.entity';
import { Modalidad } from 'src/modalidades/entities/modalidad.entity';
import { Pme } from 'src/pme/entities/pme.entity';
import { CentroCosto } from 'src/centro-costo/entities/centro-costo.entity';
import { SolicitudCuentaPresupuestaria } from './entities/SolicitudCuentaPresupuestaria.entity';
import { DevolverSolicitudDto } from './dto/devolver-solicitud.dto';
import { IsNumber } from 'class-validator';
import { UpdateSolicitudAdminDto } from './dto/update-solicitud-admin.dto';
import { BASE_URL, generateEmailHtml, EmailTemplateData } from 'src/auth/nodemailer/email.templates';
import { EmailService } from 'src/auth/nodemailer/email.service';
import { Anexo } from 'src/anexos/entities/anexo.entity';

@Injectable()
export class SolicitudesService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(SolicitudCompra) private readonly repo: Repository<SolicitudCompra>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(ObservacionArea) private readonly obsRepo: Repository<ObservacionArea>,
    @InjectRepository(AreaRevisora) private readonly areasRepo: Repository<AreaRevisora>,
    @InjectRepository(EstadoSolicitud) private readonly estadosRepo: Repository<EstadoSolicitud>,
    @InjectRepository(CuentaPresupuestaria) private readonly cuentasRepo: Repository<CuentaPresupuestaria>,
    @InjectRepository(SolicitudCuentaPresupuestaria) private readonly solicitudCuentaRepo: Repository<SolicitudCuentaPresupuestaria>,
    @InjectRepository(CentroCosto) private readonly centroCostoRepo: Repository<CentroCosto>,
    @InjectRepository(Anexo) private readonly anexoRepo: Repository<Anexo>,
    private readonly emailService: EmailService,
  ) {
    // Inicializar OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`[OpenAI] Configurando con API Key: ${apiKey ? apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4) : 'NO ENCONTRADA'}`);
    
    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });
  }







  // Helper para obtener toda la info necesaria para el correo
  private async getSolicitudFull(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: [
        'solicitante', 
        'estadoSolicitud', 
        'comprador', 
        'establecimiento',
        'areaRevisora',
        // ... otras relaciones de actores
      ],
    });
    if (!solicitud) throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    return solicitud;
  }

  // Helper para enviar correo
  private async notifyStatusChange(solicitud: SolicitudCompra, areaAccion?: string, motivo?: string): Promise<void> {
    const logPath = join(process.cwd(), 'email_debug.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    
    log(`notifyStatusChange called for solicitud #${solicitud.id}, status: ${solicitud.estadoSolicitud?.id}`);
    
    const { id, numero_solicitud, estadoSolicitud, solicitante, establecimiento, compradorAsignado, finAsignado, materia_solicitud, fecha_solicitud, fondo, modalidad } = solicitud;
    const newStatusId = estadoSolicitud.id;
    const destinatarios: { email: string; name: string }[] = [];
    const baseLink = `${BASE_URL}/solicitudes/${id}`;
    
    // Formatear fecha
    const fechaFormatted = fecha_solicitud ? new Date(fecha_solicitud).toLocaleDateString('es-CL') : '';

    let emailData: EmailTemplateData = {
        solicitudId: id,
        numeroSolicitud: numero_solicitud,
        subject: `Actualización Solicitud N°${numero_solicitud}`,
        headerColor: '#6c757d',
        title: `Actualización: Solicitud N°${numero_solicitud}`,
        bodyHtml: '',
        buttonText: 'Ver Solicitud',
        buttonLink: `${baseLink}/ver`,
        // Nuevos campos de detalle
        materia: materia_solicitud,
        establecimiento: establecimiento?.name,
        fechaSolicitud: fechaFormatted,
        fondo: fondo?.nombre,
        modalidad: modalidad?.nombre,
        currentStatusId: newStatusId
    };

    // 1. Lógica de Destinatarios y Contenido
    switch (newStatusId) {
        case 1: // Ingresada (Solo solicitante)
        case 4: // Borrador (Solo solicitante)
            destinatarios.push({ email: solicitante.email, name: solicitante.name });
            emailData.headerColor = '#6c757d'; // Color neutro para borrador/ingreso inicial
            emailData.title = newStatusId === 4 ? `📝 Solicitud N°${numero_solicitud} Guardada como Borrador` : `✅ Solicitud N°${numero_solicitud} Ingresada`;
            emailData.bodyHtml = newStatusId === 4 
                ? `<p>Hola <strong>${solicitante.name}</strong>, su solicitud para <strong>${solicitud.materia_solicitud}</strong> ha sido guardada como borrador. Recuerde enviarla a revisión cuando esté lista.</p>`
                : `<p>Hola <strong>${solicitante.name}</strong>, su solicitud para <strong>${solicitud.materia_solicitud}</strong> ha sido ingresada correctamente. Pronto será revisada.</p>`;
            break;
        
        case 3: // En Revisión (Solicitante)
            // Cuando pasa a revisión (normalmente paso automático o manual)
             destinatarios.push({ email: solicitante.email, name: solicitante.name });
             emailData.headerColor = '#17a2b8';
             emailData.title = `📝 Solicitud N°${numero_solicitud} En Revisión`;
             emailData.bodyHtml = `<p>Hola <strong>${solicitante.name}</strong>, su solicitud está siendo revisada por el área correspondiente.</p>`;
             break;

        case 7: // Pendiente Finanzas (Solicitante + Revisor Finanzas si está asignado)
             emailData.headerColor = '#ffc107';
             emailData.title = `💰 Solicitud N°${numero_solicitud} en Finanzas`;
             
             // A solicitante 
             destinatarios.push({ email: solicitante.email, name: solicitante.name });

             // A Finanzas (si está asignado) - COMENTADO POR SOLICITUD DE USUARIO (Solo solicitante)
             /* if (finAsignado) {
                destinatarios.push({ email: finAsignado.email, name: finAsignado.name });
                emailData.buttonLink = `${baseLink}/finanzas`; // Link para acción
             } */
             emailData.bodyHtml = `<p>La solicitud N°${numero_solicitud} ha avanzado a la etapa de <strong>Finanzas</strong>.</p>`;
             break;

        case 8: // Pendiente Compras (Solicitante + Comprador si está asignado)
             emailData.headerColor = '#007bff';
             emailData.title = `🛒 Solicitud N°${numero_solicitud} en Compras`;
             
             // A solicitante
             destinatarios.push({ email: solicitante.email, name: solicitante.name });

             if (compradorAsignado) {
                // Si ya tiene asignado, notificar al específico
                destinatarios.push({ email: compradorAsignado.email, name: compradorAsignado.name });
                emailData.buttonLink = `${baseLink}/compras`; 
                emailData.bodyHtml = `<p>Hola <strong>${compradorAsignado.name}</strong>, tiene asignada la solicitud N°${numero_solicitud}.</p>`;
             } else {
                // SI NO TIENE ASIGNADO: Notificar al equipo de Compras
                
                // 1. Obtener resumen de la cola
                const pendientes = await this.findForCompradorQueue(); 
                const totalPendientes = pendientes.length;

                // 2. Obtener Compradores
                let allCompradores = await this.usuarioRepo.find({
                    where: { roles: { nombre: 'COMPRADOR' } },
                    relations: ['roles']
                });

                // 3. Excluir Administradores definidos
                const excludedEmails = ['rpereira@eduhuechuraba.cl', 'mveliz@eduhuechuraba.cl', 'pdiaz@eduhuechuraba.cl'];
                allCompradores = allCompradores.filter(u => !excludedEmails.includes(u.email));
                
                if (allCompradores.length > 0) {
                    // Limpiar datos de la ficha individual para este reporte y el stepper
                    emailData.materia = undefined;
                    emailData.fondo = undefined;
                    emailData.modalidad = undefined;
                    emailData.establecimiento = undefined; 
                    emailData.fechaSolicitud = undefined;
                    // Anulamos el status ID para evitar renderizar el Stepper visual (barra de progreso)
                    emailData.currentStatusId = undefined as any; 

                    for (const comp of allCompradores) {
                        destinatarios.push({ email: comp.email, name: comp.name });
                    }
                    
                    emailData.title = `📊 Resumen: ${totalPendientes} Solicitudes en Cola de Compras`;
                    emailData.buttonLink = `${baseLink}/compras/queue`;
                    emailData.buttonText = 'Ir a Bandeja de Compras';
                    
                    // 4. Construir Tabla HTML
                    const rows = pendientes.slice(0, 15).map(p => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${p.numero_solicitud}</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.materia_solicitud}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.establecimiento?.name || '-'}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd; white-space: nowrap;">${new Date(p.fecha_solicitud).toLocaleDateString('es-CL')}</td>
                        </tr>
                    `).join('');

                    emailData.bodyHtml = `
                        <p>Se ha recibido una nueva solicitud en Compras (<strong>#${numero_solicitud}</strong>).</p>
                        <p>Estado actual de la bandeja de entrada:</p>
                        
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; font-family: sans-serif;">
                                <thead>
                                    <tr style="background-color: #f1f3f5; color: #495057;">
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Folio</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Materia</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Establecimiento</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows}
                                </tbody>
                            </table>
                        </div>
                        ${totalPendientes > 15 ? `<p style="text-align: center; color: #868e96; font-size: 12px; margin-top: 8px;"><em>Mostrando las 15 más recientes de ${totalPendientes}.</em></p>` : ''}
                    `;
                } else {
                     // Fallback si no hay compradores validos
                     console.warn('No se encontraron compradores validos para notificar (excluyendo admins).');
                }
             }
             break;

        case 9: // Pendiente Jefa DEM (Solicitante + Jefa DEM)
             emailData.headerColor = '#6610f2';
             emailData.title = `👩‍💼 Solicitud N°${numero_solicitud} Pendiente Aprobación Jefa DEM`;
             
             // A solicitante
             destinatarios.push({ email: solicitante.email, name: solicitante.name });
             
             // Buscar usuario con rol JEFA_DEM - COMENTADO POR SOLICITUD DE USUARIO (Solo solicitante)
             /* const jefaDem = await this.usuarioRepo.findOne({
               where: { roles: { nombre: 'JEFA_DEM' } },
               relations: ['roles']
             });
             
             if (jefaDem) {
               destinatarios.push({ email: jefaDem.email, name: jefaDem.name });
             } else {
               console.warn('[EMAIL] No se encontró usuario con rol JEFA_DEM');
             } */
             
             emailData.bodyHtml = `<p>La solicitud N°${numero_solicitud} requiere aprobación final de Jefatura.</p>`;
             break;
            
        case 6: // Rechazada (Solo Solicitante)
            destinatarios.push({ email: solicitante.email, name: solicitante.name });
            emailData.headerColor = '#dc3545';
            emailData.title = `❌ Solicitud N°${numero_solicitud} Rechazada`;
            emailData.bodyHtml = `<p>Hola <strong>${solicitante.name}</strong>, su solicitud fue rechazada por <strong>${areaAccion || 'el sistema'}</strong>.</p><div style="border-left: 3px solid #dc3545; padding-left: 10px; margin-top: 10px;"><strong>Motivo:</strong> ${motivo || 'Sin motivo especificado.'}</div>`;
            break;
            
        case 10: // Devuelta al Solicitante (Solo Solicitante)
            destinatarios.push({ email: solicitante.email, name: solicitante.name });
            emailData.headerColor = '#fd7e14';
            emailData.title = `⚠️ Solicitud N°${numero_solicitud} Devuelta - Requiere Corrección`;
            emailData.buttonLink = `${baseLink}/editar`;
            emailData.buttonText = 'Corregir Solicitud';
            emailData.bodyHtml = `<p>Hola <strong>${solicitante.name}</strong>, su solicitud fue devuelta por <strong>${areaAccion || 'Revisor'}</strong> para corrección.</p><div style="border-left: 3px solid #fd7e14; padding-left: 10px; margin-top: 10px;"><strong>Comentario:</strong> ${motivo || 'Favor revisar.'}</div>`;
            break;

        case 11: // Finalizada por fraccionamiento (Solo Solicitante)
            destinatarios.push({ email: solicitante.email, name: solicitante.name });
            emailData.headerColor = '#343a40';
            emailData.title = `🚫 Solicitud N°${numero_solicitud} Cerrada por Fraccionamiento`;
            emailData.bodyHtml = `<p>Hola <strong>${solicitante.name}</strong>, su solicitud ha sido finalizada y cerrada debido a que se detectó fraccionamiento en la compra.</p>`;
            break;
        
        case 2: // Finalizada/Aprobada (Solo Solicitante)
        case 5: // Aprobada (Dependiendo de tu flujo, si 5 es final)
            destinatarios.push({ email: solicitante.email, name: solicitante.name });
            emailData.headerColor = '#198754';
            emailData.title = `✨ Solicitud N°${numero_solicitud} Finalizada Exitosamente`;
            emailData.bodyHtml = `<p>La solicitud N°${numero_solicitud} ha completado todo el flujo de aprobación.</p>`;
            break;

        default:
            log(`Status ID ${newStatusId} not handled in notifyStatusChange switch.`);
            return; // No enviar correo
    }

    // 2. Ejecutar Envío para Cada Destinatario
    // Filtramos duplicados por si acaso
    const uniqueEmails = new Set();
    
    console.log(`[EMAIL] Sending to ${destinatarios.length} recipients for status ${newStatusId}`);
    
    for (const dest of destinatarios) {
        if (!dest.email || uniqueEmails.has(dest.email)) continue;
        uniqueEmails.add(dest.email);

        // Ajustamos el saludo para cada uno si se quiere personalizar más, 
        // pero por simplicidad usamos el bodyHtml genérico o lo personalizamos mínimamente arriba.
        
        log(`Sending email to: ${dest.email}, subject: ${emailData.subject}`);
        
        try {
            const success = await this.emailService.sendNotification(
                dest.email, 
                emailData.subject, 
                generateEmailHtml({
                    ...emailData,
                })
            );
            log(`Email sent to ${dest.email}: ${success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
            log(`CRITICAL ERROR sending email to ${dest.email}: ${error.message}`);
        }
    }
  }

  async optimizeFundamentos(fundamentos: string): Promise<{ fundamentos_optimizada: string }> {
    if (!fundamentos) throw new BadRequestException("El campo de fundamentos es requerido.");

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Actúa como un Experto en Gestión Pública y Derecho Administrativo.
              Tu tarea es reescribir la justificación ("Fundamentos") de una solicitud de compra.
              
              Objetivos:
              1. Elevar el tono a un lenguaje formal, técnico y administrativo.
              2. Justificar la necesidad enfatizando la continuidad operativa o el beneficio institucional.
              3. Corregir ortografía y redacción.
              4. Mantener la idea original sin inventar cifras ni fechas.
              5. La extensión debe ser de 1 o 2 párrafos concisos.
              
              Salida: Solo devuelve el texto mejorado, sin introducciones ni comillas.`
          },
          {
            role: "user",
            content: fundamentos
          }
        ],
        temperature: 0.7,
      });

      const text = response.choices[0].message?.content || fundamentos;
      return { fundamentos_optimizada: text.trim() };
    } catch (error) {
      console.error("Error conectando con OpenAI:", error);
      // Fallback: devolver el texto original para no bloquear el flujo
      return { fundamentos_optimizada: fundamentos };
    }
  }






  // =================================================================
  // === MÉTODOS CRUD ===
  // =================================================================

// solicitudes-compra.service.ts - Método create modificado

async create(
  dto: CreateSolicitudDto,
  usuarioSolicitante: Usuario, 
  files?: any
): Promise<SolicitudCompra> {
  
  // 1. Extraer los IDs del DTO
  const {
    nombre_solicitante_id,
    establecimiento_id,
    area_revisora_id,
    fondo_id,
    modalidad_id,
    pme_id,
    ...otrosDatos 
  } = dto;

  // 2. Obtener todas las entidades relacionadas
  const [
    estadoInicial, establecimiento, areaRevisora,
    fondo, modalidad, pme
  ] = await Promise.all([
    this.estadosRepo.findOneBy({ id: 4 }), // Estado "Borrador" (ID 4 según BD)
    this.repo.manager.findOneBy(Establecimiento, { id: establecimiento_id }),
    this.areasRepo.findOneBy({ id: area_revisora_id }),
    this.repo.manager.findOneBy(Fondo, { id: fondo_id }),
    this.repo.manager.findOneBy(Modalidad, { id: modalidad_id }),
    pme_id ? this.repo.manager.findOneBy(Pme, { id: pme_id }) : Promise.resolve(null),
  ]);

  // 3. Verificamos que todas las entidades obligatorias existan
  if (!estadoInicial) throw new InternalServerErrorException("El estado 'Borrador' no se encontró.");
  if (!establecimiento) throw new BadRequestException('El ID del establecimiento no es válido.');
  if (!areaRevisora) throw new BadRequestException('El ID del área revisora no es válido.');
  if (!fondo) throw new BadRequestException('El ID del fondo no es válido.');
  if (!modalidad) throw new BadRequestException('El ID de la modalidad no es válido.');
  
  // 4. GENERACIÓN DEL NÚMERO DE SOLICITUD (CORRELATIVO DE NEGOCIO DINÁMICO)
  // Generamos el prefijo basado en el año actual (ej: COMPRAS26-)
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const prefijo = `COMPRAS${yearSuffix}-`;
  
  const lastSolicitud = await this.repo
    .createQueryBuilder('solicitud')
    .select('solicitud.numero_solicitud')
    .where('solicitud.numero_solicitud LIKE :prefijo', { prefijo: `${prefijo}%` })
    .orderBy('solicitud.numero_solicitud', 'DESC')
    .getOne();

  let proximoNumero = 1;
  if (lastSolicitud && lastSolicitud.numero_solicitud) {
    const partes = lastSolicitud.numero_solicitud.split('-');
    if (partes.length > 1) {
      const ultimoNumero = parseInt(partes[1], 10);
      if (!isNaN(ultimoNumero)) {
        proximoNumero = ultimoNumero + 1;
      }
    }
  }

  const numeroCorrelativo = String(proximoNumero).padStart(5, '0');
  const folioGenerado = prefijo + numeroCorrelativo;

  // 5. Creamos el objeto final con los OBJETOS COMPLETOS
  const data: Partial<SolicitudCompra> = {
    ...otrosDatos,
    numero_solicitud: folioGenerado, // <-- AHORA ASIGNADO ANTES DE GUARDAR
    solicitante: usuarioSolicitante,
    estadoSolicitud: estadoInicial, // Debería ser ID 4 (Borrador)
    establecimiento,
    areaRevisora,
    fondo,
    modalidad,
    pme,
  };
  
  // La lógica para manejar archivos
  if (files) {
    const basePath = '/uploads/';
    for (const key in files) {
      if (key === 'anexos') continue;
      if (files[key]?.[0]) {
        data[key] = basePath + files[key][0].filename;
      }
    }
  }


  // 6. Creamos y guardamos la entidad final en UNA SOLA SENTENCIA
  const entity = this.repo.create(data);
  // Refuerzo explícito del estado Borrador (ID 4)
  entity.estadoSolicitud = estadoInicial; 
  const saved = await this.repo.save(entity);

  if (files && files.anexos) {
      await this.processAnexos(saved, files.anexos);
  }
  
  // [NOTIFICACIÓN] - Cargamos la solicitud completa con relaciones para el email
  const fullSolicitud = await this.findOne(saved.id);
  this.notifyStatusChange(fullSolicitud, undefined, undefined).catch(e => console.error('Error enviando correo Create:', e));
  
  return saved;

}

async findOne(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: [
            'solicitante',
            'solicitante.roles',
            'establecimiento',
            'areaRevisora',
            'estadoSolicitud',
            'fondo',
            'modalidad',
            'finAsignado',
            'finCentroCosto',
            'cuentasPresupuestarias',
            'cuentasPresupuestarias.cuentaPresupuestaria', 
            'cuentasPresupuestarias.centroCosto',
            'compradorAsignado',
            'areaAsignado',
            'observacionesArea',
            'observacionesArea.usuario',
            'observacionesArea.areaRevisora',
            'pme',
            'anexos',
          ],
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    }
    return solicitud;
  }


  async findAll(): Promise<SolicitudCompra[]> {
    return this.repo.find({
      // Carga solo las relaciones necesarias para la vista principal, por rendimiento.
      relations: [
        'establecimiento', 'areaRevisora', 'estadoSolicitud',
        'solicitante', 'finAsignado', 'compradorAsignado', 'areaAsignado'
      ],
      order: { id: 'DESC' }
    });
  }



async update(
    id: number, 
    dto: UpdateSolicitudDto, 
    usuarioActual: Usuario, 
    files?: any
): Promise<SolicitudCompra> {
    
    if (!usuarioActual || !usuarioActual.id) {
        throw new ForbiddenException('No se pudo identificar al usuario autenticado para realizar esta acción.');
    }

    const existingSolicitud = await this.repo.findOne({ 
        where: { id },
        relations: ['estadoSolicitud', 'solicitante'] 
    });

    if (!existingSolicitud) {
        throw new NotFoundException(`Solicitud ${id} no encontrada.`);
    }

    let payloadToMerge: Partial<SolicitudCompra> = {};
    
    const {
        area_revisora_id, 
        fondo_id, 
        modalidad_id, 
        pme_id, 
        nombre_solicitante_id, 
        establecimiento_id, 

        ...dataFields 
    } = dto;

    let debeCambiarAEnRevision = false; // Flag para cambiar a estado 3

    if (existingSolicitud.estadoSolicitud.id === 10) {
        // LÓGICA DE ACTUALIZACIÓN DESDE ESTADO DEVUELTO (ID 10)
        
        const solicitanteId = existingSolicitud.solicitante.id;
        const usuarioLogueadoId = Number(usuarioActual.id);
        
        console.log('ID Solicitante DB:', solicitanteId);
        console.log('ID Usuario Logueado (Después de Fix):', usuarioLogueadoId);

        if (solicitanteId !== usuarioLogueadoId) {
            throw new ForbiddenException('Solo el solicitante original puede modificar una solicitud devuelta.');
        }

        // Campos que el solicitante puede editar cuando es devuelta
        const safeDataFields: Partial<SolicitudCompra> = {
            materia_solicitud: dataFields.materia_solicitud,
            fundamentos_solicitud: dataFields.fundamentos_solicitud,
            observaciones_considerar: dataFields.observaciones_considerar,
            monto_estimado: dataFields.monto_estimado,
            id_convenio_marco: dataFields.id_convenio_marco,
            
            cotizacion: dataFields.cotizacion, 
            terminos_de_referencia: dataFields.terminos_de_referencia,
            bt: dataFields.bt,
            req_compra_agil: dataFields.req_compra_agil,
            nominas: dataFields.nominas,
            espec_productos: dataFields.espec_productos,
        };
        
          payloadToMerge = {
                  ...safeDataFields, 
                  // Se permite actualizar algunas FKs también
                  ...(area_revisora_id !== undefined && { areaRevisora: { id: area_revisora_id } as any }),
                  ...(fondo_id !== undefined && { fondo: { id: fondo_id } as any }),
                  ...(modalidad_id !== undefined && { modalidad: { id: modalidad_id } as any }),
                  ...(pme_id !== undefined && { pme: { id: pme_id } as any }),
              };
        
        // 🚨 CORRECCIÓN AQUÍ: Si se edita una solicitud devuelta, debe reenviarse a revisión (ID 3).
        debeCambiarAEnRevision = true; 
        
    } else {
        // LÓGICA DE ACTUALIZACIÓN DESDE OTROS ESTADOS (1, 4, etc.)
        payloadToMerge = {
            ...dataFields, 
            
            // Mapeo de IDs a Relaciones para TypeORM:
            ...(area_revisora_id !== undefined && { areaRevisora: { id: area_revisora_id } as any }),
            ...(fondo_id !== undefined && { fondo: { id: fondo_id } as any }),
            ...(modalidad_id !== undefined && { modalidad: { id: modalidad_id } as any}),
            ...(pme_id !== undefined && { pme: { id: pme_id }as any }),
        };

         // Si está en Ingresada (1), avanzamos a revisión. 
        // Si está en Borrador (4), se mantiene en borrador hasta que se envíe explícitamente.
        if (existingSolicitud.estadoSolicitud.id === 1) {
             debeCambiarAEnRevision = true;
        }
    }
    // ==========================================================

    // 3. Limpiamos los valores 'undefined' para no intentar actualizar campos no enviados.
    Object.keys(payloadToMerge).forEach(key => {
        if (payloadToMerge[key as keyof Partial<SolicitudCompra>] === undefined) {
            delete payloadToMerge[key as keyof Partial<SolicitudCompra>];
        }
    });

    // 4. Aplicar el payload sobre la entidad existente.
    Object.assign(existingSolicitud, payloadToMerge);
    
    // 5. Lógica de Manejo de Archivos (Mantenida)
if (files) {

         const basePath = '/uploads/';
           for (const key in files) {
                if (key === 'anexos') continue;
                       if (files[key]?.[0]) {
                          type FileKeys = 'cotizacion' | 'terminos_de_referencia' | 'bt' | 'req_compra_agil' | 'nominas' | 'espec_productos';
                          
                          const entityKey = key as keyof SolicitudCompra;
                          
                          if (key in existingSolicitud && (existingSolicitud as any)[key] !== undefined) {
                              if (['cotizacion', 'terminos_de_referencia', 'bt', 'req_compra_agil', 'nominas', 'espec_productos'].includes(key)) {

                                  const fileKey = key as FileKeys;
                                  const oldFilePath = existingSolicitud[fileKey];

                                  // ... (Lógica de borrado de archivo omitida por brevedad) ...

                                  existingSolicitud[fileKey] = basePath + files[key][0].filename; 
                              }
                          }
                      }
                  }
    }
    
    existingSolicitud.updated_at = new Date();

    // 7. APLICAR CAMBIO DE ESTADO A "EN REVISIÓN" (ID 3) SI APLICA
    if (debeCambiarAEnRevision) {
        const nuevoEstado = await this.estadosRepo.findOneBy({ id: 3 }); // 3 = "En revisión"
        if (!nuevoEstado) {
            throw new InternalServerErrorException("El estado 'En revisión' (ID 3) no se encontró.");
        }
        existingSolicitud.estadoSolicitud = nuevoEstado;
    }
    
    // 6. Guardar y devolver la entidad
     const saved = await this.repo.save(existingSolicitud);

    // Procesar Anexos DESPUÉS de guardar (para evitar que TypeORM los borre por orphanedRowAction al sincronizar)
    if (files && files.anexos) {
        await this.processAnexos(saved, files.anexos);
    }
    
    return saved;
}

  private async processAnexos(solicitud: SolicitudCompra, anexosFiles: any[]) {
      if (!anexosFiles || anexosFiles.length === 0) return;
      
      const entities = anexosFiles.map(file => {
          return this.anexoRepo.create({
              nombre_original: file.originalname,
              nombre_archivo: '/uploads/' + file.filename,
              mimetype: file.mimetype,
              size: file.size,
              solicitud: solicitud
          });
      });
      await this.anexoRepo.save(entities);
  }  

async remove(id: number) {
    const solicitud = await this.repo.findOneBy({ id });
    if (!solicitud) throw new NotFoundException(`Solicitud ${id} no encontrada.`);
    await this.repo.remove(solicitud);
    return { ok: true, message: `Solicitud ${id} eliminada.` };
  }
  
  // =================================================================
  // === MÉTODOS DE FLUJO Y BANDEJAS ===
  // =================================================================

async enviarParaRevision(solicitudId: number, usuarioSolicitante: Usuario): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id: solicitudId },
      relations: ['estadoSolicitud', 'solicitante'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.solicitante.id !== usuarioSolicitante.id) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción.');
    }
     // El estado inicial ahora es 4 ("Borrador"), mantenemos 1 por compatibilidad.
     if (solicitud.estadoSolicitud.id !== 1 && solicitud.estadoSolicitud.id !== 4) { 
      throw new BadRequestException('Esta solicitud ya ha sido enviada a revisión.');
    }

    const nuevoEstado = await this.estadosRepo.findOneBy({ id: 3 }); // 3 = "En revisión "
    if (!nuevoEstado) {
      throw new InternalServerErrorException('Estado "En revisión" no encontrado.');
    }

    solicitud.estadoSolicitud = nuevoEstado;
    const saved = await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(saved.id);
    this.notifyStatusChange(fullSolicitud, undefined, undefined).catch(e => console.error('Error enviando correo Enviar a Revisión:', e));
    
    return fullSolicitud;
  }

  
  async removeAnexo(anexoId: number): Promise<{ ok: boolean }> {
    const anexo = await this.anexoRepo.findOne({
      where: { id: anexoId }
    });

    if (!anexo) {
      throw new NotFoundException(`Anexo con ID ${anexoId} no encontrado.`);
    }

    // 1. Eliminar archivo físico
    if (anexo.nombre_archivo) {
      const filePath = join(process.cwd(), anexo.nombre_archivo);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error al eliminar archivo físico: ${filePath}`, error);
        }
      }
    }

    // 2. Eliminar registro en BD
    await this.anexoRepo.remove(anexo);

    return { ok: true };
  }

  async findForAreaRevisoraQueue(areaId: number): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { 
        areaRevisora: { id: areaId },
        areaAsignado: IsNull(),
        estadoSolicitud: { id: 3 }, // 3 = "En revisión"
      },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async findForAreaRevisoraUser(userId: number): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { areaAsignado: { id: userId } },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { updated_at: 'DESC' },
    });
  }

  async assignToAreaRevisora(solicitudId: number, dto: AssignAreaDto): Promise<SolicitudCompra> {
    const [solicitud, usuario] = await Promise.all([
      this.repo.findOneBy({ id: solicitudId }),
      this.usuarioRepo.findOneBy({ id: dto.area_asignado_id }),
    ]);
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (!usuario) throw new BadRequestException('El usuario a asignar no existe.');

    solicitud.areaAsignado = usuario;
    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(solicitudId);
    this.notifyStatusChange(fullSolicitud, 'Jefa DEM', undefined).catch(e => console.error('Error enviando correo Aprobar Jefa DEM:', e));
    
    return fullSolicitud;
  }

// ... (código anterior)

async revisarSolicitud(solicitudId: number, dto: RevisarSolicitudDto, usuarioRevisor: Usuario): Promise<SolicitudCompra> {
  const solicitud = await this.repo.findOne({ 
    where: { id: solicitudId }, 
    relations: ['areaRevisora', 'estadoSolicitud', 'solicitante']  
  });
  
  if (!solicitud) {
    throw new NotFoundException('Solicitud no encontrada.');
  }
  
  // Validamos que la solicitud esté en el estado correcto para la revisión del área
  if (solicitud.estadoSolicitud.id !== 3) {
    throw new BadRequestException('La solicitud debe estar en estado "En revisión de Área" (ID 3) para ser revisada.');
  }
  
  let esDerivacion = false; // Flag para saber si hubo derivación

  // 1. Registro de Observación
  if (dto.observacion) {
    const nuevaObservacion = this.obsRepo.create({
      observacion: dto.observacion,
      usuario: usuarioRevisor,
      areaRevisora: solicitud.areaRevisora, // Se registra con el área actual
      solicitud: solicitud,
    });
    await this.obsRepo.save(nuevaObservacion);
  }
  
  // 2. Lógica de Derivación (si aplica)
  if (dto.nueva_area_revisora_id) {
    const nuevaArea = await this.areasRepo.findOneBy({ id: dto.nueva_area_revisora_id });
    if (!nuevaArea) {
      throw new BadRequestException('La nueva área revisora no es válida.');
    }
    
    // VERIFICACIÓN CLAVE: No se puede derivar a sí mismo
    if (solicitud.areaRevisora.id === nuevaArea.id) {
        throw new BadRequestException('No se puede derivar la solicitud a la misma área actual.');
    }
    
    solicitud.areaRevisora = nuevaArea;
    solicitud.areaAsignado = null; // Desasignamos al usuario específico al derivar
    esDerivacion = true;
  }
  
  // 3. Cambio de Estado
  if (esDerivacion) {
    // Si hubo derivación, la solicitud MANTIENE el estado "En revisión" (ID 3),
    // pero ahora con la nueva áreaRevisora.
    // solicitud.estadoSolicitud = estado "En revisión" (ID 3) - No es necesario reasignar
    console.log(`Solicitud ${solicitudId} derivada al área ID ${solicitud.areaRevisora.id}`);

  } else {
    // Si NO hubo derivación (revisión finalizada por el área actual), avanza al siguiente estado
    // ✅ Nuevo estado: Pendiente Aprobación Finanzas (ID 7)
    const estadoFinanzas = await this.estadosRepo.findOneBy({ id: 7 }); 
    if (!estadoFinanzas) {
      throw new InternalServerErrorException('Estado "Pendiente Aprobación Finanzas" (ID 7) no encontrado.');
    }
    solicitud.estadoSolicitud = estadoFinanzas;
  }
  
  // Siempre se quita la asignación al usuario después de cualquier acción de revisión
  solicitud.areaAsignado = null; 
  
  await this.repo.save(solicitud);
  
  // [NOTIFICACIÓN]
  // Si avanzó a finanzas (7) o sigue en revisión (3)
  this.notifyStatusChange(solicitud, solicitud.areaRevisora.nombre, dto.observacion).catch(e => console.error('Error enviando correo Revisar:', e));

  // Devolvemos la solicitud con todas las relaciones cargadas
  return this.findOne(solicitudId); 
}

  async findForFinanzasQueue(): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { 
        finAsignado: IsNull(),
        estadoSolicitud: { id: 7 }
      },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async findForCompradorQueue(): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { 
        compradorAsignado: IsNull(),
        estadoSolicitud: { id: 8 }
      },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async findForFinanzasUser(userId: number): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { finAsignado: { id: userId } },
      relations: [
        'establecimiento', 'areaRevisora','estadoSolicitud',
        'solicitante', 'finAsignado', 'compradorAsignado', 'areaAsignado'
      ],
      order: { updated_at: 'DESC' },
    });
  }

async assignToFinanzas(id: number, dto: AssignFinanzasDto): Promise<SolicitudCompra> {
    const [solicitud, usuario] = await Promise.all([
      // ✅ CORRECCIÓN: Usamos findOne con 'relations' para cargar 'estadoSolicitud'
      this.repo.findOne({ where: { id }, relations: ['estadoSolicitud'] }), 
      this.usuarioRepo.findOneBy({ id: dto.fin_asignado_id }),
    ]);
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (!usuario) throw new BadRequestException('El usuario a asignar no existe.');

    // Validación de estado
    if (solicitud.estadoSolicitud.id !== 7) {
        throw new BadRequestException('La solicitud debe estar en estado "Pendiente Aprobación Finanzas" (ID 7) para ser asignada.');
    }
    
    solicitud.finAsignado = usuario;
    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN] - Notificar al usuario asignado
    const fullSolicitud = await this.findOne(id);
    this.notifyStatusChange(fullSolicitud, 'Asignación Finanzas', undefined).catch(e => console.error('Error enviando correo Asignación Finanzas:', e));
    
    return fullSolicitud;
  }


async updateFinanzas(id: number, dto: UpdateFinanzasDto): Promise<SolicitudCompra> {
  // 1️⃣ Buscar la solicitud actual con todas sus relaciones relevantes
  const solicitudActual = await this.repo.findOne({
    where: { id },
    relations: [
      'cuentasPresupuestarias',
      'estadoSolicitud',
      'finCentroCosto'
    ]
  });

  if (!solicitudActual) {
    throw new NotFoundException('Solicitud no encontrada.');
  }

  // 2️⃣ Inicializar objeto parcial de actualización
  const dataToUpdate: Partial<SolicitudCompra> = {};

  // 3️⃣ Eliminar las relaciones antiguas si existen
  if (solicitudActual.cuentasPresupuestarias?.length > 0) {
    await this.solicitudCuentaRepo.delete({ solicitud: { id } });
  }

  // 4️⃣ Crear nuevas relaciones desde el DTO
  let nuevasRelaciones: SolicitudCuentaPresupuestaria[] = [];
  if (dto.cuentas && dto.cuentas.length > 0) {
    const cuentaIds = dto.cuentas.map(c => c.cuentaId);
    // Validamos solo los IDs únicos para permitir duplicados (mismo ID, diferente centro de costo)
    const uniqueIds = [...new Set(cuentaIds)];
    const cuentas = await this.cuentasRepo.find({ where: { id: In(uniqueIds) } });

    if (cuentas.length !== uniqueIds.length) {
      throw new BadRequestException('Uno o más IDs de cuentas presupuestarias son inválidos.');
    }

    const cuentasMap = new Map(cuentas.map(c => [c.id, c]));

    nuevasRelaciones = await Promise.all(
      dto.cuentas.map(async cuentaDto => {
        const montoParaBd = String(cuentaDto.monto).replace(',', '.');

        // Relación con centro de costo por cuenta (si se envía)
        let centroCosto: CentroCosto | null = null;
        if (cuentaDto.centroCostoId) {
          centroCosto = await this.centroCostoRepo.findOneBy({ id: cuentaDto.centroCostoId });
          if (!centroCosto) {
            throw new BadRequestException(`Centro de costo con ID ${cuentaDto.centroCostoId} no encontrado.`);
          }
        }

        return this.solicitudCuentaRepo.create({
          cuentaPresupuestaria: cuentasMap.get(cuentaDto.cuentaId),
          solicitud: { id },
          montoImputado: montoParaBd,
          centroCosto: centroCosto ?? undefined,
        });
      })
    );

    dataToUpdate.cuentasPresupuestarias = nuevasRelaciones;
  } else {
    dataToUpdate.cuentasPresupuestarias = [];
  }

  // 5️⃣ Asignar Centro de Costo General (legacy)
  if (dto.fin_centro_costo_id !== undefined) {
    if (dto.fin_centro_costo_id === null) {
      dataToUpdate.finCentroCosto = null;
    } else {
      const centroCosto = await this.centroCostoRepo.findOneBy({ id: dto.fin_centro_costo_id });
      if (!centroCosto) {
        throw new BadRequestException('El ID del centro de costo es inválido.');
      }
      dataToUpdate.finCentroCosto = centroCosto;
    }
  }

  // 6️⃣ Guardar análisis financiero si existe
  if (dto.fin_analisis !== undefined) {
    (solicitudActual as any).fin_analisis = dto.fin_analisis;
  }

  // 7️⃣ Cambiar el estado al siguiente paso del flujo (Pendiente Aprobación Jefa DEM)
  // 7️⃣ Cambiar el estado: si es fraccionada cierra en 11, si no avanza a 8 (Compras)
  
  if (dto.esFraccionada) {
      solicitudActual.fraccionamiento_compra = true;
  }

  const isFraccionada = solicitudActual.fraccionamiento_compra === true;
  const nuevoEstadoId = isFraccionada ? 11 : 9; // <-- CAMBIADO: A Jefa DEM (ID 9)
  
  const estadoSiguiente = await this.estadosRepo.findOneBy({ id: nuevoEstadoId });
  if (!estadoSiguiente) {
    throw new InternalServerErrorException(`El estado ID ${nuevoEstadoId} no fue encontrado.`);
  }
  dataToUpdate.estadoSolicitud = estadoSiguiente;

  // 7.1 Registrar comentario de Finanzas si existe
  if (dto.fin_analisis && solicitudActual.finAsignado) {
      const observacion = this.obsRepo.create({
          observacion: `[FINANZAS] ${dto.fin_analisis}`,
          usuario: solicitudActual.finAsignado, 
          areaRevisora: solicitudActual.areaRevisora,
          solicitud: solicitudActual,
      });
      await this.obsRepo.save(observacion);
  }

  // 8️⃣ Fusionar y guardar
  this.repo.merge(solicitudActual, dataToUpdate);
  solicitudActual.cuentasPresupuestarias = nuevasRelaciones;

  const savedSolicitud = await this.repo.save(solicitudActual);

  // [NOTIFICACIÓN]
  const fullSolicitud = await this.findOne(savedSolicitud.id);
  this.notifyStatusChange(fullSolicitud, 'Finanzas', undefined).catch(e => console.error('Error enviando correo Finanzas:', e));

  // 9️⃣ Devolver la solicitud con todas las relaciones
  return fullSolicitud;
}




  async findForCompradorUser(userId: number): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { compradorAsignado: { id: userId } },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { updated_at: 'DESC' },
    });
  }


async assignToComprador(id: number, dto: AssignCompradorDto): Promise<SolicitudCompra> {
    const [solicitud, usuario] = await Promise.all([
      // ✅ CORRECCIÓN: Usamos findOne con 'relations' para cargar 'estadoSolicitud'
      this.repo.findOne({ where: { id }, relations: ['estadoSolicitud'] }),
      this.usuarioRepo.findOneBy({ id: dto.comprador_asignado_id }),
    ]);
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (!usuario) throw new BadRequestException('El usuario a asignar no existe.');

    solicitud.compradorAsignado = usuario;
    // Validación de estado
    if (solicitud.estadoSolicitud.id !== 8) {
        throw new BadRequestException('La solicitud debe estar en estado "Pendiente Aprobación Compras" (ID 8) para ser asignada.');
    }
    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN] - Notificar al usuario asignado
    const fullSolicitud = await this.findOne(id);
    this.notifyStatusChange(fullSolicitud, 'Asignación Compras', undefined).catch(e => console.error('Error enviando correo Asignación Compras:', e));
    
    return fullSolicitud;
  }


async updateComprador(id: number, dto: UpdateCompradorDto): Promise<SolicitudCompra> {
  console.log(`[DEBUG] updateComprador EJECUTADO para ID: ${id}. DTO:`, dto);
  
  // 1. Buscar la solicitud con relaciones
  const solicitud = await this.repo.findOne({ 
      where: { id }, 
      relations: ['estadoSolicitud', 'compradorAsignado', 'areaRevisora'] 
  });
  
  if (!solicitud) {
    throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
  }

  // 2. Validar estado (Debe ser 8)
  // Permitimos re-confirmar si ya es 2? No, dice "no cambia". Así que asumimos que es 8.
  if (solicitud.estadoSolicitud?.id !== 8 && solicitud.estadoSolicitud?.id !== 2) {
      // Si ya es 2, quizás solo estamos actualizando datos. Pero la regla dice "Pendiente".
      console.log(`[DEBUG] Intento de finalizar solicitud con estado ${solicitud.estadoSolicitud?.id}`);
      // throw new BadRequestException... (lo relajamos para debug o mantenemos estricto?)
      // Mantenemos estricto, salvo que sea ya 2.
      if (solicitud.estadoSolicitud?.id !== 2)
        throw new BadRequestException('La solicitud debe estar en estado "Pendiente Aprobación Compras" (ID 8) para finalizar.');
  }

  // 3. Validar existencia ID 2
  const estadoFinalizada = await this.estadosRepo.findOneBy({ id: 2 });
  if (!estadoFinalizada) {
     throw new InternalServerErrorException('El estado "Finalizada" (ID 2) no fue encontrado.');
  }

  // 4. Actualizar campos del DTO en la entidad (sin estado)
  if (dto.orden_compra !== undefined) solicitud.orden_compra = dto.orden_compra;
  if (dto.numero_licitacion !== undefined) solicitud.numero_licitacion = dto.numero_licitacion;
  if (dto.fecha_publicacion !== undefined) solicitud.fecha_publicacion = dto.fecha_publicacion ? new Date(dto.fecha_publicacion) : null;
  if (dto.fecha_apertura !== undefined) solicitud.fecha_apertura = dto.fecha_apertura ? new Date(dto.fecha_apertura) : null;
  if (dto.fecha_cierre !== undefined) solicitud.fecha_cierre = dto.fecha_cierre ? new Date(dto.fecha_cierre) : null;
  if (dto.numero_cotizacion !== undefined) solicitud.numero_cotizacion = dto.numero_cotizacion;
  
  if (dto.monto_final_compra !== undefined) {
      if (dto.monto_final_compra === null || dto.monto_final_compra === '') {
          solicitud.monto_final_compra = null;
      } else {
          solicitud.monto_final_compra = String(dto.monto_final_compra).replace(',', '.');
      }
  }
  
  if (dto.comentarios_orden_compra !== undefined) solicitud.comentarios_orden_compra = dto.comentarios_orden_compra;
  if (dto.com_observaciones !== undefined) solicitud.com_observaciones = dto.com_observaciones;

  // 5. Guardar DATOS (manteniendo estado original por ahora, para evitar reversiones mágicas por cascade)
  // Nota: Si el estado ya venía cargado como 8, se guardará como 8 (o lo que tenga).
  const saved = await this.repo.save(solicitud);

  // 6. Registrar comentario del Comprador si existe (Legacy)
  if (dto.comentarios_orden_compra && solicitud.compradorAsignado) {
      const observacion = this.obsRepo.create({
          observacion: `[COMPRAS - FINALIZADO] ${dto.comentarios_orden_compra}`,
          usuario: solicitud.compradorAsignado,
          areaRevisora: solicitud.areaRevisora,
          solicitud: saved, // Usamos saved para asegurar referencia
      });
      await this.obsRepo.save(observacion);
  }

  // 6b. Registrar nueva observación de Compras (com_observaciones)
  if (dto.com_observaciones && solicitud.compradorAsignado) {
      const obsCompras = this.obsRepo.create({
        observacion: `[COMPRAS - OBSERVACIÓN] ${dto.com_observaciones}`,
        usuario: solicitud.compradorAsignado,
        areaRevisora: solicitud.areaRevisora,
        solicitud: saved,
      });
      await this.obsRepo.save(obsCompras);
  }

  // 7. CAMBIAR ESTADO A FINALIZADA (ID 2) FUERZOSAMENTE CON UPDATE
  // Esto evita problemas de entity manager, cascades, etc.
  console.log(`[DEBUG BD] Forzando cambio de estado a 2 para ID ${id} via UPDATE directo.`);
  await this.repo.update(id, { estadoSolicitud: estadoFinalizada });

  // [NOTIFICACIÓN]
  const fullSolicitud = await this.findOne(saved.id);
  
  if (fullSolicitud.estadoSolicitud?.id !== 2) {
      console.error(`[CRITICAL] ALERTA: El estado sigue siendo ${fullSolicitud.estadoSolicitud?.id} despues del UPDATE.`);
      // Último intento desesperado: Query Raw
      // await this.repo.query('UPDATE solicitudes_compra SET estado_solicitud_id = 2 WHERE id = @0', [id]);
  } else {
      console.log('[DEBUG BD] Estado verificado correctamente en 2.');
  }

  this.notifyStatusChange(fullSolicitud, 'Compras', undefined).catch(e => console.error('Error enviando correo Comprador:', e));
  
  return fullSolicitud;
}


  // =================================================================
  // === EVALUAR FRACCIONAMIENTO (COMPRADOR) ===
  // =================================================================
  async evaluarFraccionamiento(
    id: number, 
    esFraccionada: boolean, 
    usuario: Usuario
  ): Promise<SolicitudCompra> {
    
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: ['estadoSolicitud', 'compradorAsignado']
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud #${id} no encontrada.`);
    }

    // Validar que quien ejecuta sea el comprador asignado
    if (solicitud.compradorAsignado?.id !== usuario.id) {
        throw new ForbiddenException('Solo el comprador asignado puede realizar esta evaluación.');
    }

    // 1. Guardamos el valor del fraccionamiento
    solicitud.fraccionamiento_compra = esFraccionada;

    // 2. Lógica de cambio de estado
    if (esFraccionada) {
        // CASO YES: Se detecta fraccionamiento -> Se finaliza/cancela el proceso
        // Usamos Estado 11 (Finalizada por Fraccionamiento)
        solicitud.estadoSolicitud = { id: 11 } as any; 
        
        // Opcional: Agregar un comentario automático
        // solicitud.comentarios_orden_compra = (solicitud.comentarios_orden_compra || '') + '\n[SISTEMA]: Solicitud finalizada por detección de fraccionamiento.';
    
    } else {
        // CASO NO: No hay fraccionamiento.
        // MANTENER EL ESTADO ACTUAL (Sea 2 u 8).
        console.log(`[DEBUG BD] Fraccionamiento FALSE. Manteniendo estado actual: ${solicitud.estadoSolicitud?.id}`);
    }

    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(id);
    this.notifyStatusChange(fullSolicitud, 'Compras', undefined).catch(e => console.error('Error enviando correo Fraccionamiento Comprador:', e));
    
    return fullSolicitud;
  }

// =================================================================
  // === EVALUAR FRACCIONAMIENTO (FINANZAS) ===
  // =================================================================
  async evaluarFraccionamientoFinanzas(
    id: number, 
    esFraccionada: boolean, 
    usuario: Usuario
  ): Promise<SolicitudCompra> {
    
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: ['estadoSolicitud', 'finAsignado']
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud #${id} no encontrada.`);
    }

    // Validar que quien ejecuta sea el comprador asignado
    if (solicitud.finAsignado?.id !== usuario.id) {
        throw new ForbiddenException('Solo el usuario de finanzas asignado puede realizar esta evaluación.');
    }

    // 1. Guardamos el valor del fraccionamiento
    solicitud.fraccionamiento_compra = esFraccionada;

    // 2. Lógica de cambio de estado
    if (esFraccionada) {
        // CASO YES: Se detecta fraccionamiento -> Se finaliza/cancela el proceso
        // Usamos Estado 5 (Rechazada) o el que uses para cerrar el proceso negativamente
        solicitud.estadoSolicitud = { id: 11 } as any; 
        
        // Opcional: Agregar un comentario automático
        // solicitud.comentarios_orden_compra = (solicitud.comentarios_orden_compra || '') + '\n[SISTEMA]: Solicitud finalizada por detección de fraccionamiento.';
    
    } else {
        // CASO NO: No hay fraccionamiento -> Sigue al siguiente proceso
        // Asumiendo que el siguiente paso es la revisión de Jefatura (ID 9)
        solicitud.estadoSolicitud = { id: 9 } as any; // Va a Jefa DEM
        
        // Opcional: Asignar fecha de paso a Jefa DEM si lo usas
        // solicitud.jefaDemFecha = new Date();
    }

    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(id);
    this.notifyStatusChange(fullSolicitud, 'Finanzas', undefined).catch(e => console.error('Error enviando correo Fraccionamiento Finanzas:', e));
    
    return fullSolicitud;
  }



  // =================================================================
/**
 * Encuentra las solicitudes que están pendientes de aprobación final por la Jefa DEM (ID 10).
 */
async findForJefaDemQueue(): Promise<SolicitudCompra[]> {
    return this.repo.find({
        where: { 
        estadoSolicitud: { id: 9 }, // 9 = Pendiente Aprobación Jefa DEM
      },
      relations: [
        'establecimiento', 'estadoSolicitud', 'solicitante', 'areaRevisora'
      ],
      order: { updated_at: 'DESC' },
    });
}

/**
 * Aprueba la solicitud y la mueve a estado Finalizado (ID 9).
 */
async aprobarJefaDem(solicitudId: number, usuarioJefaDem: Usuario, observacionText?: string): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({ 
        where: { id: solicitudId }, 
        relations: ['estadoSolicitud', 'areaRevisora'] 
    });
    if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
    }

    // El estado debe ser Pendiente Aprobación Jefa DEM (ID 9)
    if (solicitud.estadoSolicitud.id !== 9) {
        throw new BadRequestException('Esta solicitud no está pendiente de aprobación por la Jefa DEM.');
    }
        const estadoCompras = await this.estadosRepo.findOneBy({ id: 8 }); // <-- CAMBIADO: De 2 a 8 (Compras)
    if (!estadoCompras) {
        throw new InternalServerErrorException('El estado "Pendiente Compras" (ID 8) no fue encontrado.');    
    }
    
    solicitud.estadoSolicitud = estadoCompras;

    // ✅ Registro de la decisión final
    solicitud.jefaDemAsignado = usuarioJefaDem;
    // Asumiendo que 'estadoAprobado' se refiere a un estado de aprobación general, no al estado final.
    // Si se necesita un estado específico para "Aprobado por Jefa DEM", se debería crear.
    // Por ahora, se mantiene la lógica original de asignar el estado de destino como aprobación.
    solicitud.jefaDemAprobacion = estadoCompras; // Asigna el estado al que se mueve como "aprobación"
    solicitud.jefaDemFecha = new Date();

    if (observacionText) {
        solicitud.jefa_observaciones = observacionText;
    }

     // Registrar comentario de aprobación
     const obsTexto = observacionText 
        ? `[APROBACIÓN J.DEM] ${observacionText}` 
        : `[APROBACIÓN J.DEM] Solicitud aprobada y derivada a Compras correctamente.`;

     const observacion = this.obsRepo.create({
         observacion: obsTexto,
         usuario: usuarioJefaDem,
         areaRevisora: solicitud.areaRevisora,
         solicitud: solicitud,
     });
     await this.obsRepo.save(observacion);
     
     await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(solicitudId);
    this.notifyStatusChange(fullSolicitud, 'Jefa DEM', undefined).catch(e => console.error('Error enviando correo Aprobar Jefa DEM:', e));
    
    return fullSolicitud;
}


  async rechazarJefaDem(solicitudId: number, dto: RevisarSolicitudDto, usuarioJefaDem: Usuario): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({ 
        where: { id: solicitudId }, 
        relations: ['areaRevisora', 'estadoSolicitud'] 
    });
    
    if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
    }
    
    if (!dto.observacion || dto.observacion.trim().length < 5) { // Bajamos a 5 por flexibilidad
        throw new BadRequestException('Se requiere una observación detallada para rechazar la solicitud.');
    }

    if (solicitud.estadoSolicitud.id !== 9) {
        throw new BadRequestException('Esta solicitud no está pendiente de aprobación por la Jefa DEM.');
    }

    const observacion = this.obsRepo.create({
        observacion: `[RECHAZO J.DEM] ${dto.observacion}`,
        usuario: usuarioJefaDem, 
        areaRevisora: solicitud.areaRevisora,
        solicitud: solicitud,
    });
    await this.obsRepo.save(observacion);

    const estadoRechazado = await this.estadosRepo.findOneBy({ id: 6 });
    if (!estadoRechazado) {
        throw new InternalServerErrorException('El estado "Rechazada" (ID 6) no fue encontrado.');
    }

    solicitud.estadoSolicitud = estadoRechazado;
    solicitud.jefaDemAsignado = usuarioJefaDem;
    solicitud.jefaDemAprobacion = estadoRechazado;
    solicitud.jefaDemFecha = new Date();

    await this.repo.save(solicitud);
    const fullSolicitud = await this.findOne(solicitudId);
    this.notifyStatusChange(fullSolicitud, 'Jefa DEM', dto.observacion).catch(e => console.error('Error enviando correo Rechazar Jefa DEM:', e));
    return fullSolicitud;
  }

  async devolverJefaAFinanzas(solicitudId: number, dto: DevolverSolicitudDto, usuarioJefaDem: Usuario): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({ 
        where: { id: solicitudId }, 
        relations: ['areaRevisora', 'estadoSolicitud', 'finAsignado'] 
    });
    
    if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
    }
    
    if (solicitud.estadoSolicitud.id !== 9) {
        throw new BadRequestException('Solo se pueden devolver solicitudes que están en aprobación de Jefatura (ID 9).');
    }

    // 1. Registro de observación
    const observacion = this.obsRepo.create({
        observacion: `[DEVOLUCIÓN J.DEM a FINANZAS] ${dto.observacion}`,
        usuario: usuarioJefaDem,
        areaRevisora: solicitud.areaRevisora,
        solicitud: solicitud,
    });
    await this.obsRepo.save(observacion);

    // 2. Cambio de estado a "Pendiente Finanzas" (ID 7)
    const estadoFinanzas = await this.estadosRepo.findOneBy({ id: 7 });
    if (!estadoFinanzas) {
        throw new InternalServerErrorException('El estado "Pendiente Finanzas" (ID 7) no fue encontrado.');
    }

    solicitud.estadoSolicitud = estadoFinanzas;
    // Mantenemos al analista asignado para que pueda corregir
    solicitud.jefaDemAsignado = null;
    solicitud.jefaDemAprobacion = null;
    solicitud.jefaDemFecha = null;

    await this.repo.save(solicitud);
    
    const fullSolicitud = await this.findOne(solicitudId);
    this.notifyStatusChange(fullSolicitud, 'Jefa DEM (Devolución a Finanzas)', dto.observacion).catch(e => console.error('Error enviando correo Devolver a Finanzas:', e));
    
    return fullSolicitud;
  }

  async rechazar(solicitudId: number, dto: RevisarSolicitudDto, usuario: Usuario, role?: string): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id: solicitudId },
      relations: ['areaRevisora', 'estadoSolicitud'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (!dto.observacion || dto.observacion.trim().length < 5) {
       throw new BadRequestException('Se requiere una observación para rechazar la solicitud.');
    }

    // Validación de roles si se especifica
    if (role) {
        if (role === 'finanzas' && solicitud.estadoSolicitud.id !== 7) {
             throw new BadRequestException('La solicitud no está en etapa de Finanzas.');
        }
        if (role === 'compras' && solicitud.estadoSolicitud.id !== 8) {
             throw new BadRequestException('La solicitud no está en etapa de Compras.');
        }
        if (role === 'jefadem' && solicitud.estadoSolicitud.id !== 9) {
             throw new BadRequestException('La solicitud no está en etapa de Jefa DEM.');
        }
         if (role === 'areas' && solicitud.estadoSolicitud.id !== 3) {
             throw new BadRequestException('La solicitud no está en etapa de Revisión de Área.');
        }
    }

    // 1. Registro de observación
    const observacion = this.obsRepo.create({
      observacion: `[RECHAZO ${role ? role.toUpperCase() : 'GENÉRICO'}] ${dto.observacion}`,
      usuario: usuario,
      areaRevisora: solicitud.areaRevisora,
      solicitud: solicitud,
    });
    await this.obsRepo.save(observacion);

    // 2. Cambio de estado a "Rechazada" (ID 6)
    const estadoRechazado = await this.estadosRepo.findOneBy({ id: 6 });
    if (!estadoRechazado) {
      throw new InternalServerErrorException('El estado "Rechazada" (ID 6) no fue encontrado.');
    }

    solicitud.estadoSolicitud = estadoRechazado;

    // Si es Jefa DEM, actualizamos sus campos específicos también
    if (role === 'jefadem' || solicitud.estadoSolicitud.id === 9) {
        solicitud.jefaDemAsignado = usuario;
        solicitud.jefaDemAprobacion = estadoRechazado;
        solicitud.jefaDemFecha = new Date();
    }

    // Limpiar asignaciones pendientes
    solicitud.finAsignado = null;
    solicitud.compradorAsignado = null;
    solicitud.areaAsignado = null;

    await this.repo.save(solicitud);
    
    // [NOTIFICACIÓN]
    const fullSolicitud = await this.findOne(solicitudId);
    this.notifyStatusChange(fullSolicitud, role || 'Sistema', dto.observacion).catch(e => console.error('Error enviando correo Rechazar:', e));
    
    return fullSolicitud;
  }

// =================================================================
// === NUEVO MÉTODO DE DEVOLUCIÓN ===
// =================================================================

async devolverAlSolicitante(
  solicitudId: number,
  dto: DevolverSolicitudDto,
  usuarioRevisor: Usuario,
): Promise<SolicitudCompra> {
  // 1. Cargar la solicitud con sus relaciones clave
  const solicitud = await this.repo.findOne({
    where: { id: solicitudId },
    relations: ['estadoSolicitud', 'areaRevisora'],
  });

  if (!solicitud) {
    throw new NotFoundException('Solicitud no encontrada.');
  }

  // Se permite la devolución desde cualquier estado de revisión/aprobación:
  // (3) En revisión Área, (7) Pendiente Finanzas, (8) Pendiente Compras, (9) Pendiente Jefa DEM
  const estadosPermitidos = [3, 7, 8, 9]; 
  if (!estadosPermitidos.includes(solicitud.estadoSolicitud.id)) {
    throw new BadRequestException(`No se puede devolver una solicitud en estado: ${solicitud.estadoSolicitud.nombre}.`);
  }
  
  // 2. Obtener el estado "Devuelta al Solicitante" (Asumimos ID 10)
  const estadoDevuelto = await this.estadosRepo.findOneBy({ id: 10 }); 
  if (!estadoDevuelto) {
    throw new InternalServerErrorException('El estado "Devuelta al Solicitante" (ID 10) no fue encontrado.');
  }

  // 3. Registro de Observación
  const observacion = this.obsRepo.create({
    observacion: `[DEVOLUCIÓN - ${usuarioRevisor.name}] ${dto.observacion}`,
    usuario: usuarioRevisor,
    areaRevisora: solicitud.areaRevisora, // Usamos el área de la solicitud
    solicitud: solicitud,
  });
  await this.obsRepo.save(observacion);

  // 4. Cambio de Estado y Limpieza de Asignaciones (Requiere las propiedades | null)
  solicitud.estadoSolicitud = estadoDevuelto;
  solicitud.areaAsignado = null; // Limpieza
  solicitud.finAsignado = null; // Limpieza
  solicitud.compradorAsignado = null; // Limpieza
  
  // 5. Limpiar decisión Jefa DEM si viene de esa etapa
  solicitud.jefaDemAsignado = null;
  solicitud.jefaDemAprobacion = null;
  solicitud.jefaDemFecha = null;

  // 6. Guardar
  await this.repo.save(solicitud);
  
  // [NOTIFICACIÓN]
  const fullSolicitud = await this.findOne(solicitudId);
  this.notifyStatusChange(fullSolicitud, usuarioRevisor.name, dto.observacion).catch(e => console.error('Error enviando correo Devolver:', e));
  
  return fullSolicitud;
}


// =================================================================
  // === ACTUALIZACIÓN ADMINISTRATIVA (GOD MODE) ===
  // =================================================================
  async adminUpdate(id: number, dto: UpdateSolicitudAdminDto): Promise<SolicitudCompra> {
    // 1. Buscar la solicitud existente
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: [
        'estadoSolicitud', 'areaRevisora', 'fondo', 'modalidad', 
        'compradorAsignado', 'finAsignado', 'establecimiento'
      ]
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    }

    // 2. Actualizar campos simples (si vienen en el DTO)
    if (dto.numero_solicitud !== undefined) solicitud.numero_solicitud = dto.numero_solicitud;
    if (dto.materia_solicitud !== undefined) solicitud.materia_solicitud = dto.materia_solicitud;
    if (dto.fundamentos_solicitud !== undefined) solicitud.fundamentos_solicitud = dto.fundamentos_solicitud;
    if (dto.monto_estimado !== undefined) solicitud.monto_estimado = dto.monto_estimado;
    if (dto.id_convenio_marco !== undefined) solicitud.id_convenio_marco = dto.id_convenio_marco;
    if (dto.observaciones_considerar !== undefined) solicitud.observaciones_considerar = dto.observaciones_considerar;
    
    // Campos de compra
    if (dto.orden_compra !== undefined) solicitud.orden_compra = dto.orden_compra;
    if (dto.numero_cotizacion !== undefined) solicitud.numero_cotizacion = dto.numero_cotizacion;
    if (dto.numero_licitacion !== undefined) solicitud.numero_licitacion = dto.numero_licitacion;
    if (dto.comentarios_orden_compra !== undefined) solicitud.comentarios_orden_compra = dto.comentarios_orden_compra;
    if (dto.com_observaciones !== undefined) solicitud.com_observaciones = dto.com_observaciones;
    if (dto.monto_final_compra !== undefined) solicitud.monto_final_compra = dto.monto_final_compra;
    if (dto.jefa_observaciones !== undefined) solicitud.jefa_observaciones = dto.jefa_observaciones;
    if (dto.fraccionamiento_compra !== undefined) solicitud.fraccionamiento_compra = dto.fraccionamiento_compra;

    // Fechas
    if (dto.fecha_publicacion !== undefined) solicitud.fecha_publicacion = dto.fecha_publicacion ? new Date(dto.fecha_publicacion) : null;
    if (dto.fecha_apertura !== undefined) solicitud.fecha_apertura = dto.fecha_apertura ? new Date(dto.fecha_apertura) : null;
    if (dto.fecha_cierre !== undefined) solicitud.fecha_cierre = dto.fecha_cierre ? new Date(dto.fecha_cierre) : null;

    // 3. Actualizar Relaciones (Foreign Keys)
    // TypeORM permite asignar un objeto { id: X } a la relación para actualizar la FK

    if (dto.estado_solicitud_id) {
      solicitud.estadoSolicitud = { id: dto.estado_solicitud_id } as any;
    }

    if (dto.area_revisora_id) {
      solicitud.areaRevisora = { id: dto.area_revisora_id } as any;
    }

    if (dto.fondo_id) {
      solicitud.fondo = { id: dto.fondo_id } as any;
    }

    if (dto.modalidad_id) {
      solicitud.modalidad = { id: dto.modalidad_id } as any;
    }
    
    if (dto.establecimiento_id) {
       solicitud.establecimiento = { id: dto.establecimiento_id } as any;
    }

    if (dto.pme_id !== undefined) {
      if (dto.pme_id === null) {
        solicitud.pme = null;
      } else {
        solicitud.pme = { id: dto.pme_id } as any;
      }
    }

    // 4. Actualizar Asignaciones de Usuarios (Manejo de nulos)
    
    // Comprador
    if (dto.comprador_asignado_id !== undefined) {
      if (dto.comprador_asignado_id === null) {
        solicitud.compradorAsignado = null;
      } else {
        solicitud.compradorAsignado = { id: dto.comprador_asignado_id } as any;
      }
    }

    // Analista Finanzas
    if (dto.fin_asignado_id !== undefined) {
      if (dto.fin_asignado_id === null) {
        solicitud.finAsignado = null;
      } else {
        solicitud.finAsignado = { id: dto.fin_asignado_id } as any;
      }
    }

    // --- 👇 NUEVO: Cuentas Presupuestarias (Admin) ---
    if (dto.cuentas !== undefined) {
      // 1. Borrar relaciones antiguas
      await this.solicitudCuentaRepo.delete({ solicitud: { id } });

      if (dto.cuentas && dto.cuentas.length > 0) {
        const cuentaIds = dto.cuentas.map(c => c.cuentaId);
        const uniqueIds = [...new Set(cuentaIds)];
        const cuentasEntidades = await this.cuentasRepo.find({ where: { id: In(uniqueIds) } });

        const cuentasMap = new Map(cuentasEntidades.map(c => [c.id, c]));

        const nuevasRelaciones = await Promise.all(
          dto.cuentas.map(async cuentaDto => {
            const montoParaBd = String(cuentaDto.monto).replace(',', '.');

            let centroCosto: CentroCosto | null = null;
            if (cuentaDto.centroCostoId) {
              centroCosto = await this.centroCostoRepo.findOneBy({ id: cuentaDto.centroCostoId });
            }

            return this.solicitudCuentaRepo.create({
              cuentaPresupuestaria: cuentasMap.get(cuentaDto.cuentaId),
              solicitud: { id },
              montoImputado: montoParaBd,
              centroCosto: centroCosto ?? undefined,
            });
          })
        );
        solicitud.cuentasPresupuestarias = nuevasRelaciones;
      } else {
        solicitud.cuentasPresupuestarias = [];
      }
    }

    // --- 👇 NUEVO: Centro de Costo (Legacy) ---
    if (dto.fin_centro_costo_id !== undefined) {
      if (dto.fin_centro_costo_id === null) {
        solicitud.finCentroCosto = null;
      } else {
        solicitud.finCentroCosto = { id: dto.fin_centro_costo_id } as any;
      }
    }

    if (dto.solicitante_id !== undefined && dto.solicitante_id !== null) {
      solicitud.solicitante = { id: dto.solicitante_id } as any;
    }

    // 5. Guardar cambios
    // Usamos save para que se ejecuten los subscribers si tienes alguno, o update puro si prefieres rendimiento
    await this.repo.save(solicitud);

    // 6. Retornar la solicitud actualizada y fresca
    return this.findOne(id);
  }

  // =================================================================
  // === DESTACAR SOLICITUD ===
  // =================================================================
  async destacarSolicitud(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: ['estadoSolicitud']
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    }

    // Alternar el estado de destacada
    solicitud.destacada = !solicitud.destacada;
    
    await this.repo.save(solicitud);
    return this.findOne(id);
  }

  // =================================================================
  // === GUARDAR Y LIBERAR (DEVUELVE A LA BANDEJA DE COMPRAS) ===
  // =================================================================
  
  async liberarSolicitudComprador(
    id: number, 
    dto: UpdateCompradorDto, 
    usuario: Usuario
  ): Promise<SolicitudCompra> {
    
    // 1. Buscamos la solicitud con las relaciones necesarias para validar
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: ['estadoSolicitud', 'compradorAsignado']
    });

    console.log('Service - Solicitud Found:', solicitud ? 'Yes' : 'No');
    if (solicitud) {
        console.log('Service - Estado:', solicitud.estadoSolicitud?.id);
        console.log('Service - Comprador Asignado:', solicitud.compradorAsignado?.id);
    }

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    }

    // 2. Validaciones de Seguridad
    
    // Validar que esté en el estado correcto (Pendiente Aprobación Compras - ID 8)
    if (solicitud.estadoSolicitud.id !== 8) {
      throw new BadRequestException('La solicitud no se encuentra en la etapa de Compras (ID 8), no se puede liberar.');
    }


    // Validar que el usuario que intenta liberar sea quien la tiene asignada actualmente
    // (Opcional: Si eres ADMIN podrías saltarte esto, pero por seguridad de flujo es recomendable)
    if (solicitud.compradorAsignado?.id !== usuario.id) {
       throw new ForbiddenException('No puedes liberar una solicitud que no tienes asignada a tu nombre.');
    }

    // 3. Guardado Parcial de Datos y Desasignación
    // Usamos update para ser más específicos y evitar cambios no deseados en el estado
    const updateData: any = {
        compradorAsignado: null
    };

    if (dto.orden_compra !== undefined) updateData.orden_compra = dto.orden_compra;
    if (dto.numero_licitacion !== undefined) updateData.numero_licitacion = dto.numero_licitacion;
    if (dto.fecha_publicacion !== undefined) updateData.fecha_publicacion = dto.fecha_publicacion ? new Date(dto.fecha_publicacion) : null;
    if (dto.fecha_apertura !== undefined) updateData.fecha_apertura = dto.fecha_apertura ? new Date(dto.fecha_apertura) : null;
    if (dto.fecha_cierre !== undefined) updateData.fecha_cierre = dto.fecha_cierre ? new Date(dto.fecha_cierre) : null;
    if (dto.comentarios_orden_compra !== undefined) updateData.comentarios_orden_compra = dto.comentarios_orden_compra;
    if (dto.com_observaciones !== undefined) updateData.com_observaciones = dto.com_observaciones;
    if (dto.monto_final_compra !== undefined) updateData.monto_final_compra = dto.monto_final_compra;
    
    // 4. Ejecutar actualización
    await this.repo.update(id, updateData);

    // 4b. Registrar Observación de Liberación (si existe)
    if (dto.com_observaciones) {
        const obsLiberacion = this.obsRepo.create({
            observacion: `[COMPRAS - LIBERADO] ${dto.com_observaciones}`,
            usuario: usuario, 
            areaRevisora: solicitud.areaRevisora,
            solicitud: solicitud,
        });
        await this.obsRepo.save(obsLiberacion);
    }

    // 5. Retornar la solicitud fresca
    return this.findOne(id);
  }

  // =================================================================
  // === Guardado previo ===
  // =================================================================

  /**
   * Permite a un comprador guardar datos (OC, Licitación, etc.) sin cambiar el estado
   * y sin liberar la asignación (se mantiene a su nombre).
   */
  async savePrevioComprador(
    id: number, 
    dto: UpdateCompradorDto, 
    usuario: Usuario
  ): Promise<SolicitudCompra> {
    console.log(`[DEBUG] savePrevioComprador EJECUTADO para ID: ${id}`);
    
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: ['estadoSolicitud', 'compradorAsignado']
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
    }

    // 1. Validar estado
    if (solicitud.estadoSolicitud.id !== 8) {
      throw new BadRequestException('La solicitud no se encuentra en la etapa de Compras (ID 8).');
    }

    // 2. Validar que el usuario la tenga asignada
    if (solicitud.compradorAsignado?.id !== usuario.id) {
       throw new ForbiddenException('No puedes guardar cambios en una solicitud que no tienes asignada.');
    }

    // 3. Preparar datos de actualización
    const updateData: any = {};
    if (dto.orden_compra !== undefined) updateData.orden_compra = dto.orden_compra;
    if (dto.numero_cotizacion !== undefined) updateData.numero_cotizacion = dto.numero_cotizacion;
    if (dto.numero_licitacion !== undefined) updateData.numero_licitacion = dto.numero_licitacion;
    if (dto.fecha_publicacion !== undefined) updateData.fecha_publicacion = dto.fecha_publicacion ? new Date(dto.fecha_publicacion) : null;
    if (dto.fecha_apertura !== undefined) updateData.fecha_apertura = dto.fecha_apertura ? new Date(dto.fecha_apertura) : null;
    if (dto.fecha_cierre !== undefined) updateData.fecha_cierre = dto.fecha_cierre ? new Date(dto.fecha_cierre) : null;
    if (dto.comentarios_orden_compra !== undefined) updateData.comentarios_orden_compra = dto.comentarios_orden_compra;
    if (dto.com_observaciones !== undefined) updateData.com_observaciones = dto.com_observaciones;
    
    if (dto.monto_final_compra !== undefined) {
        if (dto.monto_final_compra === null || dto.monto_final_compra === '') {
            updateData.monto_final_compra = null;
        } else {
            updateData.monto_final_compra = String(dto.monto_final_compra).replace(',', '.');
        }
    }
    
    // 4. Ejecutar actualización parcial sin afectar relaciones
    await this.repo.update(id, updateData);

    return this.findOne(id);
  }

  
// =================================================================
  // === ROL VIEWER (ID 9) - SOLO LECTURA GLOBAL ===
  // =================================================================
  async findAllReadOnly(usuario: Usuario): Promise<SolicitudCompra[]> {
    
    const tienePermiso = usuario.roles.some((rol: any) => {
        // Opción A: El rol es un Objeto (viene de la BD) -> Chequeamos ID o Nombre
        if (typeof rol === 'object' && rol !== null) {
            return Number(rol.id) === 9 || Number(rol.id) === 1 || 
                   rol.nombre === 'solicitud_view' || rol.nombre === 'admin';
        }
        // Opción B: El rol es un String (viene del Token) -> Chequeamos el texto exacto
        if (typeof rol === 'string') {
            return rol === 'solicitud_view' || rol === 'admin'; 
        }
        
        return false;
    });

    if (!tienePermiso) {
        throw new ForbiddenException(
            `Acceso denegado. Se requiere el rol 'solicitud_view' (ID 9) o 'admin'.`
        );
    }

    // 2. BUSQUEDA DE DATOS
    return this.repo.find({
      relations: [
        'solicitante',
        'establecimiento',
        'estadoSolicitud',
        'fondo',
        'modalidad',
        'areaRevisora',
        'compradorAsignado',
        'finAsignado'
      ],
      order: {
        fecha_solicitud: 'DESC',
      },
    });
  }
  
  

}