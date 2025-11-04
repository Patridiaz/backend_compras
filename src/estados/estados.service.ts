import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoSolicitud } from './entities/estado-solicitud.entity';
import { CreateEstadoDto } from './dto/create-estado.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

@Injectable()
export class EstadosService {
  constructor(
    @InjectRepository(EstadoSolicitud)
    private repo: Repository<EstadoSolicitud>,
  ) {}

  create(dto: CreateEstadoDto) {
    const e = this.repo.create({ nombre: dto.nombre.trim() });
    return this.repo.save(e);
  }
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Estado no encontrado');
    return e;
  }
  async update(id: number, dto: UpdateEstadoDto) {
    const e = await this.findOne(id);
    if (dto.nombre !== undefined) e.nombre = dto.nombre.trim();
    return this.repo.save(e);
  }
  async remove(id: number) {
    const e = await this.findOne(id);
    await this.repo.remove(e);
    return { ok: true };
  }
}
