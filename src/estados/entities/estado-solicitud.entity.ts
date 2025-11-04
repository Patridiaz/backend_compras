import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('estados_solicitud')
export class EstadoSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @OneToMany(() => SolicitudCompra, (s) => s.estadoSolicitud)
  solicitudes: SolicitudCompra[];
}
