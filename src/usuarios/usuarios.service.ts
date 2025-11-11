import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { AreaRevisora } from 'src/areas/entities/area.entity';
import { RolUser } from './rol-user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private repo: Repository<Usuario>,

    @InjectRepository(AreaRevisora) private areaRepo: Repository<AreaRevisora>,
    
    @InjectRepository(RolUser) 
    private readonly rolRepo: Repository<RolUser>,

  ) {}

async findByEmail(email: string): Promise<Usuario | null> {
  return this.repo.createQueryBuilder('user') 
  
    // Esta es la línea más importante: le pedimos explícitamente la contraseña.
    .select(['user.id', 'user.email', 'user.name'])
    .addSelect('user.password')
    
    // Cargamos las relaciones que necesitamos para el login y el token.
    .leftJoinAndSelect('user.roles', 'rol')
    .leftJoinAndSelect('user.areaRevisora', 'area')
    
    // Filtramos por el email que nos llega.
    .where('user.email = :email', { email })
    
    // Obtenemos un solo resultado.
    .getOne();
}

  async findAllAdmin(): Promise<Usuario[]> {
    // ✅ CORRECCIÓN: Añade la opción 'relations' para cargar los datos relacionados.
    return this.repo.find({
      relations: {
        roles: true,
        areaRevisora: true,
      },
      order: {
        name: 'ASC' // Ordenar alfabéticamente por nombre
      }
    });
  }
  async changePassword(id: number, newPassword: string) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;

    await this.repo.save(user);
    return { ok: true, message: 'Contraseña actualizada correctamente.' };
  }

  async findOne(id: number): Promise<Usuario> {
    const user = await this.repo.findOne({
      where: { id },
      // ✅ AHORA PODEMOS USAR RELACIONES DIRECTAS
      relations: ['roles', 'areaRevisora'], 
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findOneByIdWithRelations(id: number): Promise<Usuario | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['areaRevisora'], 
    });
  }

  async create(dto: RegisterDto): Promise<Usuario> {
    const { email, password, name, area_revisora_id } = dto;

    const existingUser = await this.repo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya está registrado.');
    }

    const defaultRol = await this.rolRepo.findOne({ where: { nombre: 'USER' } });
    if (!defaultRol) {
      throw new InternalServerErrorException('Rol por defecto "USER" no encontrado.');
    }
    
    // ✅ AHORA PODEMOS ASIGNAR EL OBJETO COMPLETO PARA LA RELACIÓN
    let areaRevisora: AreaRevisora | null = null;
    if (area_revisora_id) {
        areaRevisora = await this.areaRepo.findOneBy({ id: area_revisora_id });
        if(!areaRevisora) {
            throw new NotFoundException('El área revisora especificada no existe.');
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.repo.create({
      name: name, // Uses the 'nombre' property
      email,
      password: hashedPassword,
      roles: [defaultRol],
      areaRevisora: areaRevisora, 
    });
    return this.repo.save(newUser);
  }

  
  
  // El método update ahora debe manejar un array de IDs de rol
  async update(id: number, attrs: { nombre?: string; roleIds?: number[] }) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (attrs.roleIds) {
      const roles = await this.rolRepo.findByIds(attrs.roleIds);
      user.roles = roles;
    }
    
    if (attrs.nombre) {
      user.name = attrs.nombre;
    }

    return this.repo.save(user);
  }
  
  async validatePassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }

  async getAvailableRoles() {
    const roles = await this.rolRepo.find();
    return roles.map(rol => rol.nombre);
  }
}
