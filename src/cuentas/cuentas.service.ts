import { Injectable, NotFoundException } from '@nestjs/common';
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
      periodo: dto.periodo ?? 2026, // Sistema parte desde 2026
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
            ALTER TABLE cuentas_presupuestarias ADD periodo INT NOT NULL DEFAULT 2025;
        END
      `);

      // 2. Intentar eliminar el índice antiguo de unicidad solo por código
      // Nota: El nombre del índice suele ser algo como UQ_... o IDX_...
      // Intentamos buscarlo por las columnas que lo componen
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

// ✅ MÉTODO DE REPORTE PRESUPUESTARIO (Sistema Multianual desde 2026)
  async obtenerEstadoPresupuestario(anio: number) {
    /**
     * REGLA DE NEGOCIO:
     * - El sistema parte desde 2026 en adelante.
     * - Cada año es independiente y solo suma las solicitudes de ese año calendario.
     * - No hay arrastre de años anteriores.
     */
    const query = this.repo.createQueryBuilder('cuenta')
      .leftJoin('cuenta.solicitudesRelaciones', 'relacion') 
      .leftJoin('relacion.solicitud', 'solicitud')
      .leftJoin('solicitud.estadoSolicitud', 'estado');

    // Condición de fecha: solo solicitudes del año específico
    const fechaCondicion = `YEAR(solicitud.fecha_solicitud) = ${anio}`;

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

  async obtenerAniosDisponibles() {
    const years = await this.repo.createQueryBuilder('cuenta')
      .select('DISTINCT cuenta.periodo', 'anio')
      .orderBy('cuenta.periodo', 'DESC')
      .getRawMany();
    
    return years.map(y => y.anio);
  }

  // ✅ NUEVO: Clonar presupuesto de un año a otro
  async duplicarAnio(origen: number, destino: number) {
    const cuentasOrigen = await this.repo.find({ where: { periodo: origen } });
    
    const nuevasCuentas = cuentasOrigen.map(c => {
      const { id, ...data } = c;
      return this.repo.create({
        ...data,
        periodo: destino,
        monto: 0 // Empezamos en 0 para el nuevo año, o podemos copiar el monto
      });
    });

    return this.repo.save(nuevasCuentas);
  }

  async obtenerMovimientosCuenta(cuentaId: number) {
    // Usamos el EntityManager (o repo manager) para consultar la relación directa
    // O hacemos un QueryBuilder desde la cuenta
    
    return this.repo.manager.createQueryBuilder('SolicitudCuentaPresupuestaria', 'relacion')
        .leftJoinAndSelect('relacion.solicitud', 'solicitud')
        .leftJoinAndSelect('solicitud.solicitante', 'solicitante') // Para ver quién pidió
        .leftJoinAndSelect('solicitud.estadoSolicitud', 'estado')  // Para ver el estado
        .where('relacion.cuentaPresupuestaria = :cuentaId', { cuentaId })
        // FILTRO CLAVE: Excluir Rechazadas (6) y Fraccionamiento (11)
        .andWhere('solicitud.estadoSolicitud NOT IN (:...estadosExcluidos)', { estadosExcluidos: [6, 11] })
        .orderBy('solicitud.updated_at', 'DESC') // Las más recientes primero
        .getMany();
}




}
