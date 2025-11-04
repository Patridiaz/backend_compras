import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private repo: Repository<Establecimiento>,
  ) {}

  create(dto: CreateEstablecimientoDto) {
    const e = this.repo.create({ name: dto.name.trim() });
    return this.repo.save(e);
  }
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Establecimiento no encontrado');
    return e;
  }
  async update(id: number, dto: UpdateEstablecimientoDto) {
    const e = await this.findOne(id);
    if (dto.name !== undefined) e.name = dto.name.trim();
    return this.repo.save(e);
  }
  async remove(id: number) {
    const e = await this.findOne(id);
    await this.repo.remove(e);
    return { ok: true };
  }
}
