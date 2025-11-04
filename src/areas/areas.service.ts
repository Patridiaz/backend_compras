import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AreaRevisora } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(AreaRevisora)
    private readonly repo: Repository<AreaRevisora>,
  ) {}

  create(dto: CreateAreaDto) {
    const area = this.repo.create({ nombre: dto.nombre.trim() });
    return this.repo.save(area);
  }

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const area = await this.repo.findOne({ where: { id } });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  async update(id: number, dto: UpdateAreaDto) {
    const area = await this.findOne(id);
    if (dto.nombre !== undefined) area.nombre = dto.nombre.trim();
    return this.repo.save(area);
  }

  async remove(id: number) {
    const area = await this.findOne(id);
    await this.repo.remove(area);
    return { ok: true };
  }
}
