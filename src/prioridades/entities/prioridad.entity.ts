import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('prioridades')
export class Prioridad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

}
