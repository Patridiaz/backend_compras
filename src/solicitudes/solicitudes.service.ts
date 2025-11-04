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
import { Prioridad } from 'src/prioridades/entities/prioridad.entity';
import { Fondo } from 'src/fondos/entities/fondo.entity';
import { Modalidad } from 'src/modalidades/entities/modalidad.entity';
import { Pme } from 'src/pme/entities/pme.entity';
import { CentroCosto } from 'src/centro-costo/entities/centro-costo.entity';

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(SolicitudCompra) private readonly repo: Repository<SolicitudCompra>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(ObservacionArea) private readonly obsRepo: Repository<ObservacionArea>,
    @InjectRepository(AreaRevisora) private readonly areasRepo: Repository<AreaRevisora>,
    @InjectRepository(EstadoSolicitud) private readonly estadosRepo: Repository<EstadoSolicitud>,
    @InjectRepository(CuentaPresupuestaria) private readonly cuentasRepo: Repository<CuentaPresupuestaria>,
    @InjectRepository(CentroCosto) private readonly centroCostoRepo: Repository<CentroCosto>,
  ) {}

  // =================================================================
  // === MÉTODOS CRUD ===
  // =================================================================

async create(dto: CreateSolicitudDto, files?: any): Promise<SolicitudCompra> {
  // 1. Extraemos todos los IDs y el resto de los datos del DTO
  const {
    nombre_solicitante_id,
    establecimiento_id,
    area_revisora_id,
    fondo_id,
    modalidad_id,
    pme_id,
    ...otrosDatos 
  } = dto;

  // 2. Buscamos TODOS los objetos de las entidades relacionadas en paralelo para mayor eficiencia
const [
    solicitante, estadoInicial, establecimiento, areaRevisora,
    fondo, modalidad, pme
  ] = await Promise.all([
    this.usuarioRepo.findOneBy({ id: nombre_solicitante_id }),
    this.estadosRepo.findOneBy({ id: 1 }), // Estado "Borrador"
    this.repo.manager.findOneBy(Establecimiento, { id: establecimiento_id }),
    this.areasRepo.findOneBy({ id: area_revisora_id }),
    this.repo.manager.findOneBy(Fondo, { id: fondo_id }),
    this.repo.manager.findOneBy(Modalidad, { id: modalidad_id }),
    pme_id ? this.repo.manager.findOneBy(Pme, { id: pme_id }) : Promise.resolve(null),
  ]);

  // 3. Verificamos que todas las entidades obligatorias existan para evitar errores
  if (!solicitante) throw new BadRequestException('El ID del solicitante no es válido.');
  if (!estadoInicial) throw new InternalServerErrorException("El estado 'Borrador' no se encontró.");
  if (!establecimiento) throw new BadRequestException('El ID del establecimiento no es válido.');
  if (!areaRevisora) throw new BadRequestException('El ID del área revisora no es válido.');
  if (!fondo) throw new BadRequestException('El ID del fondo no es válido.');
  if (!modalidad) throw new BadRequestException('El ID de la modalidad no es válido.');

  // 4. Creamos el objeto final con los OBJETOS COMPLETOS, no solo los IDs
  const data: Partial<SolicitudCompra> = {
    ...otrosDatos,
    solicitante,
    estadoSolicitud: estadoInicial,
    establecimiento,
    areaRevisora,
    fondo,
    modalidad,
  };
  
  // La lógica para manejar archivos sigue igual
  if (files) {
    const basePath = '/uploads/';
    for (const key in files) {
      if (files[key]?.[0]) {
        data[key] = basePath + files[key][0].filename;
      }
    }
  }

  // 5. Creamos y guardamos la entidad final
  const entity = this.repo.create(data);
  return this.repo.save(entity);
}


async findOne(id: number): Promise<SolicitudCompra> {
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: [
        'establecimiento', 'areaRevisora', 'estadoSolicitud', 
        'fondo', 'modalidad', 'pme', 'finCuenta','finCentroCosto', 'observacionesArea',
        'solicitante', 'finAsignado', 'compradorAsignado', 'areaAsignado',
        'observacionesArea.usuario', 'observacionesArea.areaRevisora', 
        'jefaDemAsignado', 'jefaDemAprobacion' 
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


  async update(id: number, dto: UpdateSolicitudDto, files?: any) {
    const solicitud = await this.repo.preload({ id: id, ...dto });
    if (!solicitud) throw new NotFoundException(`Solicitud ${id} no encontrada.`);
    
    if (files) {
      const basePath = '/uploads/';
      for (const key in files) {
        if (files[key]?.[0]) {
          const oldFilePath = solicitud[key];
          if(oldFilePath) {
            try {
              const fullPath = join(process.cwd(), 'uploads', oldFilePath.split('/').pop());
              if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            } catch (error) { console.error('Error al borrar archivo antiguo:', error); }
          }
          solicitud[key] = basePath + files[key][0].filename;
        }
      }
    }

    return this.repo.save(solicitud);
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

async revisarSolicitud(solicitudId: number, dto: RevisarSolicitudDto, usuarioRevisor: Usuario): Promise<SolicitudCompra> {
  const solicitud = await this.repo.findOne({ 
    where: { id: solicitudId }, 
    relations: ['areaRevisora', 'estadoSolicitud'] 
  });
  
  if (!solicitud) {
    throw new NotFoundException('Solicitud no encontrada.');
  }
  
    if (solicitud.estadoSolicitud.id !== 3) {
        throw new BadRequestException('La solicitud debe estar en estado "En revisión de Área" (ID 3) para ser revisada.');
    }
  
  // Usamos el objeto de usuario directamente para evitar búsquedas redundantes y problemas de tipado
  
  if (dto.observacion) {
    const nuevaObservacion = this.obsRepo.create({
      observacion: dto.observacion,
      usuario: usuarioRevisor, // Usamos el objeto completo
      areaRevisora: solicitud.areaRevisora,
      solicitud: solicitud,
    });
    await this.obsRepo.save(nuevaObservacion);
  }
  
  // Asignación a nueva área (si aplica)
  if (dto.nueva_area_revisora_id) {
    const nuevaArea = await this.areasRepo.findOneBy({ id: dto.nueva_area_revisora_id });
    if (!nuevaArea) {
      throw new BadRequestException('La nueva área revisora no es válida.');
    }
    solicitud.areaRevisora = nuevaArea;      
    solicitud.areaAsignado = null; // Se desasigna al derivar
  }
  
  // ✅ Nuevo estado: Pendiente Aprobación Finanzas (ID 7)
  const estadoFinanzas = await this.estadosRepo.findOneBy({ id: 7 }); 
  if (!estadoFinanzas) {
    throw new InternalServerErrorException('Estado "Pendiente Aprobación Finanzas" (ID 7) no encontrado.');
  }
  solicitud.estadoSolicitud = estadoFinanzas;
  solicitud.areaAsignado = null; // Quita la asignación después de la revisión
  
  await this.repo.save(solicitud);
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
    // 1. Carga la solicitud actual (solo las columnas necesarias para actualizar)
    //    Es mejor usar findOne para cargar relaciones si las necesitas validar,
    //    o preload si confías en los IDs del DTO. Usaremos preload aquí.
    const solicitudActual = await this.repo.findOneBy({ id });
    if (!solicitudActual) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    // Prepara los datos a actualizar
    const dataToUpdate: Partial<SolicitudCompra> = {};

    // 2. Maneja Cuenta Presupuestaria (como antes)
    if (dto.fin_cuenta_id !== undefined) {
      if (dto.fin_cuenta_id === null) {
        dataToUpdate.finCuenta = null;
      } else {
        const cta = await this.cuentasRepo.findOneBy({ id: dto.fin_cuenta_id });
        if (!cta) throw new BadRequestException('El fin_cuenta_id es inválido.');
        dataToUpdate.finCuenta = cta;
      }
    }


    if (dto.fin_centro_costo_id !== undefined) {
        if (dto.fin_centro_costo_id === null) {
            dataToUpdate.finCentroCosto = null;
        } else {
            const centroCosto = await this.centroCostoRepo.findOneBy({ id: dto.fin_centro_costo_id });
            if (!centroCosto) {
              throw new BadRequestException('El ID del centro de costo (fin_centro_costo_id) es inválido.');
            }
            dataToUpdate.finCentroCosto = centroCosto; // Asigna el objeto CentroCosto
        }
    }
    

    // 5. Determina y asigna el siguiente estado (como antes)
    const estadoSiguiente = await this.estadosRepo.findOneBy({ id: 9 }); // A Jefa DEM
    if (!estadoSiguiente) {
      throw new InternalServerErrorException('El estado "Pendiente Aprobación Jefa DEM" (ID 9) no fue encontrado.');
    }
    dataToUpdate.estadoSolicitud = estadoSiguiente;

    // 6. Fusiona los cambios con la entidad existente y guarda
    //    Usar merge es más seguro que save directo con preload si quieres control fino
    this.repo.merge(solicitudActual, dataToUpdate);
    const savedSolicitud = await this.repo.save(solicitudActual);

    // 7. Devuelve la solicitud completa con todas las relaciones cargadas
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
}