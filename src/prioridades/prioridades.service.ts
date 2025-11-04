import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prioridad } from './entities/prioridad.entity';
import { CreatePrioridadDto } from './dto/create-prioridad.dto';
import { UpdatePrioridadDto } from './dto/update-prioridad.dto';

@Injectable()
export class PrioridadesService {
  constructor(
    @InjectRepository(Prioridad) private repo: Repository<Prioridad>,
  ) {}

  create(dto: CreatePrioridadDto) {
    const p = this.repo.create({ nombre: dto.nombre.trim() });
    return this.repo.save(p);
  }
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Prioridad no encontrada');
    return p;
  }
  async update(id: number, dto: UpdatePrioridadDto) {
    const p = await this.findOne(id);
    if (dto.nombre !== undefined) p.nombre = dto.nombre.trim();
    return this.repo.save(p);
  }
  async remove(id: number) {
    const p = await this.findOne(id);
    await this.repo.remove(p);
    return { ok: true };
  }
}
