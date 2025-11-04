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
}
