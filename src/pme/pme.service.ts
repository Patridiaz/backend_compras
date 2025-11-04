import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pme } from './entities/pme.entity';

@Injectable()
export class PmeService {
  constructor(
    @InjectRepository(Pme) // Inyecta el repositorio
    private readonly pmeRepo: Repository<Pme>,
  ) {}

  /**
   * Encuentra todos los PME asociados a un establecimiento específico.
   * @param establecimientoId El ID del establecimiento.
   * @returns Una lista de PMEs.
   */
  async findByEstablecimiento(establecimientoId: number): Promise<Pme[]> {
    if (!establecimientoId) {
      return [];
    }

    const queryBuilder = this.pmeRepo.createQueryBuilder('pme')
      .where('pme.establecimiento_id = :id', { id: establecimientoId }) // Filtra directamente por la columna FK
      .orderBy('pme.dimension', 'ASC')
      .addOrderBy('pme.descripcionAccion', 'ASC');

    // Imprime la consulta SQL generada para verla
    console.log('SQL Query:', queryBuilder.getSql());

    try {
      const pmes = await queryBuilder.getMany();
      console.log('PMEs Encontrados en Servicio:', pmes); // Verifica el resultado aquí
      return pmes;
    } catch (error) {
      console.error('Error ejecutando consulta PME:', error);
      throw error; // Relanza el error para que NestJS lo maneje
    }
  }

  // Opcional: Método para obtener todos los PME (si lo necesitas)
  async findAll(): Promise<Pme[]> {
    return this.pmeRepo.find({
      order: { id: 'ASC' },
    });
  }
}