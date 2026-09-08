import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CuentaPresupuestaria } from './entities/cuenta-presupuestaria.entity';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { UpdateCuentaDto } from './dto/update-cuenta.dto';

@Injectable()
export class CuentasService {
  constructor(
    @InjectRepository(CuentaPresupuestaria)
    private repo: Repository<CuentaPresupuestaria>,
  ) {}

  create(dto: CreateCuentaDto) {
    const e = this.repo.create({
      ...dto,
      periodo: dto.periodo ?? new Date().getFullYear(),
    });
    return this.repo.save(e);
  }

  findAll(query?: string, anio?: number) {
    const where: any = {};
    
    if (anio) {
      where.periodo = anio;
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      return this.repo.find({
        where: [
          { ...where, codigo: ILike(q) },
          { ...where, descripcion: ILike(q) }
        ],
        order: { codigo: 'ASC' },
      });
    }
    
    return this.repo.find({ 
      where,
      order: { codigo: 'ASC' } 
    });
  }

  async findOne(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Cuenta no encontrada');
    return e;
  }

  async update(id: number, dto: UpdateCuentaDto) {
    const e = await this.findOne(id);
    Object.assign(e, dto);
    return this.repo.save(e);
  }

  async remove(id: number) {
    const e = await this.findOne(id);
    await this.repo.remove(e);
    return { ok: true };
  }

  async fixIndex() {
    try {
      await this.repo.query("DROP INDEX IDX_UQ_solicitud_cuenta ON solicitudes_cuentas_presupuestarias");
      return { message: 'Índice eliminado correctamente.' };
    } catch (e) {
      return { message: 'Error al eliminar índice (quizás no existe)', error: e.message };
    }
  }

  async fixDb() {
    try {
      // 1. Agregar la columna periodo si no existe
      await this.repo.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cuentas_presupuestarias') AND name = 'periodo')
        BEGIN
            ALTER TABLE cuentas_presupuestarias ADD periodo INT NOT NULL DEFAULT 2026;
        END
      `);

      // 2. Intentar eliminar el índice antiguo de unicidad solo por código
      await this.repo.query(`
        DECLARE @IndexName NVARCHAR(255);
        SELECT @IndexName = i.name
        FROM sys.indexes i
        JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.object_id = OBJECT_ID('cuentas_presupuestarias')
          AND i.is_unique = 1
          AND c.name = 'codigo'
          AND NOT EXISTS (
              SELECT 1 FROM sys.index_columns ic2 
              JOIN sys.columns c2 ON ic2.object_id = c2.object_id AND ic2.column_id = c2.column_id
              WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND c2.name = 'periodo'
          );

        IF @IndexName IS NOT NULL
        BEGIN
            EXEC('DROP INDEX ' + @IndexName + ' ON cuentas_presupuestarias');
        END
      `);

      // 3. Crear el nuevo índice si no existe
      await this.repo.query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_codigo_periodo' AND object_id = OBJECT_ID('cuentas_presupuestarias'))
        BEGIN
            CREATE UNIQUE INDEX IDX_codigo_periodo ON cuentas_presupuestarias (codigo, periodo);
        END
      `);

      return { ok: true, message: 'Esquema actualizado correctamente (Columna periodo añadida e índices actualizados).' };
    } catch (error) {
      return { ok: false, message: 'Error al actualizar esquema', error: error.message };
    }
  }

  // ✅ MÉTODO DE REPORTE PRESUPUESTARIO MULTIANUAL
  async obtenerEstadoPresupuestario(anio: number) {
    const query = this.repo.createQueryBuilder('cuenta')
      .leftJoin('cuenta.solicitudesRelaciones', 'relacion') 
      .leftJoin('relacion.solicitud', 'solicitud')
      .leftJoin('solicitud.estadoSolicitud', 'estado');

    // Condición de fecha/periodo: solicitudes imputadas al periodo presupuestario específico
    const fechaCondicion = `COALESCE(solicitud.periodo, YEAR(solicitud.fecha_solicitud)) = ${anio}`;

    query
      .select([
        'cuenta.id AS id',
        'cuenta.codigo AS codigo',
        'cuenta.descripcion AS descripcion',
        'cuenta.monto AS presupuesto_total',
        'cuenta.periodo AS periodo',
        `COALESCE(SUM(
            CASE 
                WHEN estado.id NOT IN (6, 11) AND solicitud.id IS NOT NULL AND ${fechaCondicion}
                THEN relacion.montoImputado 
                ELSE 0 
            END
         ), 0) AS total_gastado`
      ])
      .where('cuenta.periodo = :anio', { anio })
      .groupBy('cuenta.id')
      .addGroupBy('cuenta.codigo')
      .addGroupBy('cuenta.descripcion')
      .addGroupBy('cuenta.monto')
      .addGroupBy('cuenta.periodo')
      .orderBy('cuenta.codigo', 'ASC');

    const result = await query.getRawMany();
    return result;
  }

  // ✅ NUEVO: Dashboard completo de finanzas con métricas totales y desglose
  async obtenerDashboardFinanzas(anio: number) {
    const cuentas = await this.obtenerEstadoPresupuestario(anio);
    
    let presupuestoTotal = 0;
    let montoImputado = 0;

    const cuentasConSaldo = cuentas.map(c => {
      const pTotal = Number(c.presupuesto_total) || 0;
      const tGastado = Number(c.total_gastado) || 0;
      const saldoDisp = pTotal - tGastado;
      
      presupuestoTotal += pTotal;
      montoImputado += tGastado;

      return {
        id: Number(c.id),
        codigo: c.codigo,
        descripcion: c.descripcion,
        periodo: Number(c.periodo),
        presupuesto_total: pTotal,
        total_gastado: tGastado,
        saldo_disponible: saldoDisp,
      };
    });

    const saldoDisponible = presupuestoTotal - montoImputado;

    return {
      periodo: anio,
      presupuesto_total: presupuestoTotal,
      monto_imputado: montoImputado,
      saldo_disponible: saldoDisponible,
      total_cuentas: cuentasConSaldo.length,
      cuentas: cuentasConSaldo,
    };
  }

  async obtenerAniosDisponibles() {
    const years = await this.repo.createQueryBuilder('cuenta')
      .select('DISTINCT cuenta.periodo', 'anio')
      .orderBy('cuenta.periodo', 'DESC')
      .getRawMany();
    
    return years.map(y => y.anio);
  }

  // ✅ NUEVO: Clonar presupuesto de un año a otro evitando duplicados
  async duplicarAnio(origen: number, destino: number) {
    if (!origen || !destino) {
      throw new BadRequestException('Los parámetros origen y destino son obligatorios.');
    }
    if (origen === destino) {
      throw new BadRequestException('El año de origen y destino no pueden ser iguales.');
    }

    const cuentasOrigen = await this.repo.find({ where: { periodo: origen } });
    if (cuentasOrigen.length === 0) {
      throw new NotFoundException(`No se encontraron cuentas presupuestarias para el año origen ${origen}.`);
    }

    // Obtener códigos existentes en destino para no duplicar
    const cuentasDestino = await this.repo.find({ where: { periodo: destino } });
    const codigosExistentes = new Set(cuentasDestino.map(c => c.codigo?.trim().toLowerCase()));

    const aCrear = cuentasOrigen.filter(c => !codigosExistentes.has(c.codigo?.trim().toLowerCase()));

    if (aCrear.length === 0) {
      return {
        mensaje: `Todas las cuentas del año ${origen} ya existen en el año ${destino}.`,
        clonadas: 0,
        omitidas: cuentasOrigen.length,
        cuentas: [],
      };
    }

    const nuevasCuentas = aCrear.map(c => {
      return this.repo.create({
        codigo: c.codigo,
        descripcion: c.descripcion,
        periodo: destino,
        monto: 0, // Presupuesto inicial en 0 según requerimiento
      });
    });

    const guardadas = await this.repo.save(nuevasCuentas);

    return {
      mensaje: `Se duplicaron ${guardadas.length} cuentas del periodo ${origen} al ${destino} exitosamente.`,
      clonadas: guardadas.length,
      omitidas: cuentasOrigen.length - guardadas.length,
      cuentas: guardadas,
    };
  }

  async obtenerMovimientosCuenta(cuentaId: number) {
    return this.repo.manager.createQueryBuilder('SolicitudCuentaPresupuestaria', 'relacion')
        .leftJoinAndSelect('relacion.solicitud', 'solicitud')
        .leftJoinAndSelect('solicitud.solicitante', 'solicitante')
        .leftJoinAndSelect('solicitud.estadoSolicitud', 'estado')
        .where('relacion.cuentaPresupuestaria = :cuentaId', { cuentaId })
        .andWhere('solicitud.estadoSolicitud NOT IN (:...estadosExcluidos)', { estadosExcluidos: [6, 11] })
        .orderBy('solicitud.updated_at', 'DESC')
        .getMany();
  }
}
