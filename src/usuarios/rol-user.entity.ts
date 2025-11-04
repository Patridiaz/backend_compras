import { Entity, PrimaryColumn, Column, ManyToMany } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('rolUser')
export class RolUser {
  @PrimaryColumn()
  id: number;

  @Column()
  nombre: string;

  @ManyToMany(() => Usuario, user => user.roles)
  users: Usuario[];
}