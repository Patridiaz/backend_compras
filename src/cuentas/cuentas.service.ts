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
    const e = this.repo.create(dto);
    return this.repo.save(e);
  }

  findAll(query?: string) {
    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      return this.repo.find({
        where: [{ codigo: ILike(q) }, { descripcion: ILike(q) }],
        order: { codigo: 'ASC' },
      });
    }
    return this.repo.find({ order: { codigo: 'ASC' } });
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

// ✅ MÉTODO DE REPORTE PRESUPUESTARIO
  async obtenerEstadoPresupuestario() {
    // Usamos createQueryBuilder para una consulta agregada compleja
    const result = await this.repo.createQueryBuilder('cuenta')
      // Unimos con la tabla intermedia (imputaciones)
      .leftJoin('cuenta.solicitudesRelaciones', 'relacion') 
      // Unimos con la solicitud para ver su estado
      .leftJoin('relacion.solicitud', 'solicitud')
      // Unimos con el estado para filtrar por ID (más seguro)
      .leftJoin('solicitud.estadoSolicitud', 'estado') 
      
      .select([
        'cuenta.id AS id',
        'cuenta.codigo AS codigo',
        'cuenta.descripcion AS descripcion',
        'cuenta.monto AS presupuesto_total',
        // Suma condicional: Sumar montoImputado SOLO si el estado NO es 6 (Rechazada) ni 11 (Fraccionamiento)
        // Usamos COALESCE para devolver 0 si es null
        `COALESCE(SUM(
            CASE 
                WHEN estado.id NOT IN (6, 11) AND solicitud.id IS NOT NULL 
                THEN relacion.montoImputado 
                ELSE 0 
            END
         ), 0) AS total_gastado`
      ])
      // ⚠️ Regla de SQL: Todo lo que está en SELECT y no es una función de agregación (SUM), debe ir en GROUP BY
      .groupBy('cuenta.id')
      .addGroupBy('cuenta.codigo')
      .addGroupBy('cuenta.descripcion')
      .addGroupBy('cuenta.monto')
      .orderBy('cuenta.codigo', 'ASC')
      .getRawMany(); // Retorna objetos planos, no entidades

    return result;
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
