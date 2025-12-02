import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(SolicitudCompra) private readonly repo: Repository<SolicitudCompra>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(ObservacionArea) private readonly obsRepo: Repository<ObservacionArea>,
    @InjectRepository(AreaRevisora) private readonly areasRepo: Repository<AreaRevisora>,
    @InjectRepository(EstadoSolicitud) private readonly estadosRepo: Repository<EstadoSolicitud>,
    @InjectRepository(CuentaPresupuestaria) private readonly cuentasRepo: Repository<CuentaPresupuestaria>,
    @InjectRepository(SolicitudCuentaPresupuestaria) private readonly solicitudCuentaRepo: Repository<SolicitudCuentaPresupuestaria>,
    @InjectRepository(CentroCosto) private readonly centroCostoRepo: Repository<CentroCosto>,
  ) {}

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
    this.estadosRepo.findOneBy({ id: 1 }), // Estado "Borrador"
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
  
  // =========================================================================
  // 4. GENERACIÓN DEL NÚMERO DE SOLICITUD (CORRECCIÓN CRÍTICA)
  // Generamos el número antes del SAVE, basado en el máximo ID actual + 1.
  // Esto asume que el ID autoincremental de SQL Server será el siguiente número.
  // =========================================================================
  
  // Buscar el máximo ID existente en la tabla
  const result = await this.repo
    .createQueryBuilder('solicitudes_compra')
    .select('MAX(solicitudes_compra.id)', 'maxId')
    .getRawOne();
    
  const ultimoId = result?.maxId || 0;
  const proximoId = ultimoId + 1; // Estimación del ID que tendrá el nuevo registro

  const prefijo = 'COMPRAS26-';
  const numeroCorrelativo = String(proximoId).padStart(5, '0');
  const folioGenerado = prefijo + numeroCorrelativo;

  // 5. Creamos el objeto final con los OBJETOS COMPLETOS
  const data: Partial<SolicitudCompra> = {
    ...otrosDatos,
    numero_solicitud: folioGenerado, // <-- AHORA ASIGNADO ANTES DE GUARDAR
    solicitante: usuarioSolicitante,
    estadoSolicitud: estadoInicial,
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
      if (files[key]?.[0]) {
        data[key] = basePath + files[key][0].filename;
      }
    }
  }


  // 6. Creamos y guardamos la entidad final en UNA SOLA SENTENCIA
  const entity = this.repo.create(data);
  return this.repo.save(entity); // <-- Solo un SAVE. El UPDATE ya no es necesario.
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

        // Si está en Borrador (4) o Ingresada (1), también debe avanzar a revisión.
        if (existingSolicitud.estadoSolicitud.id === 1 || existingSolicitud.estadoSolicitud.id === 4) {
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
    return this.repo.save(existingSolicitud);
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
    // El estado inicial es 1 ("Ingresada"), el borrador es 4. Asumo 1 como el primer paso.
    if (solicitud.estadoSolicitud.id !== 1 && solicitud.estadoSolicitud.id !== 4) { 
      throw new BadRequestException('Esta solicitud ya ha sido enviada a revisión.');
    }

    const nuevoEstado = await this.estadosRepo.findOneBy({ id: 3 }); // 3 = "En revisión "
    if (!nuevoEstado) {
      throw new InternalServerErrorException('Estado "En revisión" no encontrado.');
    }

    solicitud.estadoSolicitud = nuevoEstado;
    return this.repo.save(solicitud);
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
    return this.findOne(solicitudId);
  }

// ... (código anterior)

async revisarSolicitud(solicitudId: number, dto: RevisarSolicitudDto, usuarioRevisor: Usuario): Promise<SolicitudCompra> {
  const solicitud = await this.repo.findOne({ 
    where: { id: solicitudId }, 
    relations: ['areaRevisora', 'estadoSolicitud'] 
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
    // ✅ CORRECCIÓN: Usamos findOne(id) para cargar todas las relaciones y evitar el error de front.
    return this.findOne(id);
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
  const estadoSiguiente = await this.estadosRepo.findOneBy({ id: 9 });
  if (!estadoSiguiente) {
    throw new InternalServerErrorException('El estado "Pendiente Aprobación Jefa DEM" no fue encontrado.');
  }
  dataToUpdate.estadoSolicitud = estadoSiguiente;

  // 8️⃣ Fusionar y guardar
  this.repo.merge(solicitudActual, dataToUpdate);
  solicitudActual.cuentasPresupuestarias = nuevasRelaciones;

  const savedSolicitud = await this.repo.save(solicitudActual);

  // 9️⃣ Devolver la solicitud con todas las relaciones
  return this.findOne(savedSolicitud.id);
}

async findForCompradorQueue(): Promise<SolicitudCompra[]> {
    return this.repo.find({
      where: { 
        compradorAsignado: IsNull(),
        estadoSolicitud: { id: 8 } 
      },
      relations: ['establecimiento', 'estadoSolicitud', 'solicitante'],
      order: { updated_at: 'DESC' },
    });
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
    // ✅ CORRECCIÓN: Usamos findOne(id) para cargar todas las relaciones y evitar el error de front.
    return this.findOne(id);
  }


async updateComprador(id: number, dto: UpdateCompradorDto): Promise<SolicitudCompra> {
  // 1. Carga la solicitud y fusiona los nuevos datos del DTO
  const solicitud = await this.repo.preload({ id: id, ...dto });
  if (!solicitud) {
    throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
  }

  // ✅ CORRECCIÓN: Cargamos el estado actual para la validación
  const currentSolicitud = await this.repo.findOne({ where: { id }, relations: ['estadoSolicitud'] });
  if (!currentSolicitud) throw new NotFoundException(`Solicitud con ID ${id} no encontrada.`);
  

  const estadoPendienteDEM = await this.estadosRepo.findOneBy({ id: 2 });
  if (!estadoPendienteDEM) {
      throw new InternalServerErrorException('El estado "Finalizada" (ID 2) no fue encontrado.');
  }
  
  // Validar estado
  // ✅ CORRECCIÓN: Uso de operador ?. para evitar TypeError (currentSolicitud.estadoSolicitud?.id)
  if (currentSolicitud.estadoSolicitud?.id !== 8) { 
        throw new BadRequestException('La solicitud debe estar en estado "Pendiente Aprobación Compras" (ID 8) para que el comprador actualice.');
  }

  // 3. Asigna el nuevo estado a la solicitud
  solicitud.estadoSolicitud = estadoPendienteDEM; 
  // Opcional: Desasignar si la lógica es que el comprador ya terminó.
  // solicitud.compradorAsignado = null; 

  // 5. Guarda la solicitud con los datos del comprador Y el nuevo estado
  return this.repo.save(solicitud);
}

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
async aprobarJefaDem(solicitudId: number, usuarioJefaDem: Usuario): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({ 
        where: { id: solicitudId }, 
        relations: ['estadoSolicitud'] 
    });
    if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
    }

    // El estado debe ser Pendiente Aprobación Jefa DEM (ID 9)
    if (solicitud.estadoSolicitud.id !== 9) {
        throw new BadRequestException('Esta solicitud no está pendiente de aprobación por la Jefa DEM.');
    }
    
    const estadoAprobado = await this.estadosRepo.findOneBy({ id: 8 }); 
    if (!estadoAprobado) {
        throw new InternalServerErrorException('El estado "Pendiente Aprobación Compras" (ID 8) no fue encontrado.');    
    }
    
    solicitud.estadoSolicitud = estadoAprobado;

    // ✅ Registro de la decisión final
    solicitud.jefaDemAsignado = usuarioJefaDem;
    solicitud.jefaDemAprobacion = estadoAprobado;
    solicitud.jefaDemFecha = new Date();
    
    await this.repo.save(solicitud);
    return this.findOne(solicitudId);
}


  async rechazarJefaDem(solicitudId: number, dto: RevisarSolicitudDto, usuarioJefaDem: Usuario): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({ 
        where: { id: solicitudId }, 
        relations: ['areaRevisora', 'estadoSolicitud'] // Incluimos estadoSolicitud para la validación
    });
    
    if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
    }
    
    if (!dto.observacion || dto.observacion.trim().length < 10) {
        throw new BadRequestException('Se requiere una observación detallada para rechazar la solicitud.');
    }

    // El estado debe ser Pendiente Aprobación Jefa DEM (ID 9)
    if (solicitud.estadoSolicitud.id !== 9) {
        throw new BadRequestException('Esta solicitud no está pendiente de aprobación por la Jefa DEM.');
    }

    // 1. Registro de observación
    // CORRECCIÓN: Usamos 'usuarioJefaDem' directamente para evitar el error de tipado y la búsqueda redundante.
    const observacion = this.obsRepo.create({
        observacion: `[RECHAZO J.DEM] ${dto.observacion}`,
        usuario: usuarioJefaDem, // Objeto Usuario garantizado, resuelve el error.
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

    // ✅ Registro de la decisión final
    solicitud.jefaDemAsignado = usuarioJefaDem;
    solicitud.jefaDemAprobacion = estadoRechazado;
    solicitud.jefaDemFecha = new Date();


    await this.repo.save(solicitud);
    return this.findOne(solicitudId);
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
    return this.findOne(solicitudId);
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
  return this.findOne(solicitudId);
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
    if (dto.materia_solicitud !== undefined) solicitud.materia_solicitud = dto.materia_solicitud;
    if (dto.fundamentos_solicitud !== undefined) solicitud.fundamentos_solicitud = dto.fundamentos_solicitud;
    if (dto.monto_estimado !== undefined) solicitud.monto_estimado = dto.monto_estimado;
    if (dto.id_convenio_marco !== undefined) solicitud.id_convenio_marco = dto.id_convenio_marco;
    
    // Campos de compra
    if (dto.orden_compra !== undefined) solicitud.orden_compra = dto.orden_compra;
    if (dto.numero_licitacion !== undefined) solicitud.numero_licitacion = dto.numero_licitacion;
    if (dto.comentarios_orden_compra !== undefined) solicitud.comentarios_orden_compra = dto.comentarios_orden_compra;

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
    if (dto.comentarios_orden_compra !== undefined) updateData.comentarios_orden_compra = dto.comentarios_orden_compra;
    
    // 4. Ejecutar actualización
    await this.repo.update(id, updateData);

    // 5. Retornar la solicitud fresca
    return this.findOne(id);
  }
  

}