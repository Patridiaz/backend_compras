import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modalidad } from './entities/modalidad.entity';
import { CreateModalidadDto } from './dto/create-modalidad.dto';
import { UpdateModalidadDto } from './dto/update-modalidad.dto';

@Injectable()
export class ModalidadesService {
  constructor(
    @InjectRepository(Modalidad) private repo: Repository<Modalidad>,
  ) {}

  async create(dto: CreateModalidadDto) {
    // Si quisieras aceptar number del FE:
    // const monto = typeof (dto as any).monto_maximo === 'number' ? String((dto as any).monto_maximo) : dto.monto_maximo;

    const entidad = this.repo.create({
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion.trim(),
      monto_maximo: dto.monto_maximo, // ya viene string
    });
    return this.repo.save(entidad);
  }

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Modalidad no encontrada');
    return m;
  }

  async update(id: number, dto: UpdateModalidadDto) {
    const parcial: Partial<Modalidad> = {};
    if (dto.nombre !== undefined) parcial.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined)
      parcial.descripcion = dto.descripcion.trim();
    if (dto.monto_maximo !== undefined) parcial.monto_maximo = dto.monto_maximo;
    await this.repo.update(id, parcial);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: number) {
    const m = await this.findOne(id);
    await this.repo.remove(m);
    return { ok: true };
  }
}
