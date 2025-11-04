import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CentroCosto } from './entities/centro-costo.entity';
import { CreateCentroCostoDto } from './dto/create-centro-costo.dto';
import { UpdateCentroCostoDto } from './dto/update-centro-costo.dto';

@Injectable()
export class CentroCostoService {
  constructor(
    @InjectRepository(CentroCosto)
    private readonly repo: Repository<CentroCosto>,
  ) {}

  async create(dto: CreateCentroCostoDto): Promise<CentroCosto> {
    // Opcional: Verificar si ya existe un centro con el mismo nombre
    const existing = await this.repo.findOneBy({ nombre: dto.nombre });
    if (existing) {
      throw new ConflictException(`Ya existe un Centro de Costo con el nombre "${dto.nombre}"`);
    }
    const centroCosto = this.repo.create(dto);
    return this.repo.save(centroCosto);
  }

  async findAll(): Promise<CentroCosto[]> {
    return this.repo.find({
      order: { nombre: 'ASC' }, // Ordenar alfabéticamente
    });
  }

  async findOne(id: number): Promise<CentroCosto> {
    const centroCosto = await this.repo.findOneBy({ id });
    if (!centroCosto) {
      throw new NotFoundException(`Centro de Costo con ID ${id} no encontrado.`);
    }
    return centroCosto;
  }

  async update(id: number, dto: UpdateCentroCostoDto): Promise<CentroCosto> {
     // Opcional: Verificar duplicados si se cambia el nombre
     if (dto.nombre) {
        const existing = await this.repo.findOne({ where: { nombre: dto.nombre, id: Not(id) } }); // Requires importing Not from typeorm
        if (existing) {
          throw new ConflictException(`Ya existe otro Centro de Costo con el nombre "${dto.nombre}"`);
        }
     }

    const centroCosto = await this.repo.preload({
      id: id,
      ...dto,
    });
    if (!centroCosto) {
      throw new NotFoundException(`Centro de Costo con ID ${id} no encontrado.`);
    }
    return this.repo.save(centroCosto);
  }

  async remove(id: number): Promise<void> {
    const centroCosto = await this.findOne(id); // Reutiliza findOne para la verificación
    // Considera qué hacer si hay solicitudes asociadas. Por defecto, TypeORM podría fallar
    // si hay FKs apuntando a él. Podrías necesitar lógica adicional aquí.
    try {
        await this.repo.remove(centroCosto);
    } catch (error) {
        // Manejar error de restricción de FK si es necesario
        if (error.message.includes('FOREIGN KEY constraint')) {
            throw new ConflictException(`No se puede eliminar el Centro de Costo ${id} porque está asociado a solicitudes.`);
        }
        throw error; // Relanzar otros errores
    }
  }
}

// Nota: Para usar Not(id) necesitarás: import { Repository, Not } from 'typeorm';