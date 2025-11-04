import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fondo } from './entities/fondo.entity';
import { CreateFondoDto } from './dto/create-fondo.dto';
import { UpdateFondoDto } from './dto/update-fondo.dto';

@Injectable()
export class FondosService {
  constructor(@InjectRepository(Fondo) private repo: Repository<Fondo>) {}

  create(dto: CreateFondoDto) {
    const f = this.repo.create({ nombre: dto.nombre.trim() });
    return this.repo.save(f);
  }
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Fondo no encontrado');
    return f;
  }
  async update(id: number, dto: UpdateFondoDto) {
    const f = await this.findOne(id);
    if (dto.nombre !== undefined) f.nombre = dto.nombre.trim();
    return this.repo.save(f);
  }
  async remove(id: number) {
    const f = await this.findOne(id);
    await this.repo.remove(f);
    return { ok: true };
  }
}
