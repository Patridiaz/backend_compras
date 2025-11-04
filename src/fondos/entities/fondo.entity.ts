import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('fondos')
export class Fondo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @OneToMany(() => SolicitudCompra, (s) => s.fondo)
  solicitudes: SolicitudCompra[];
}
