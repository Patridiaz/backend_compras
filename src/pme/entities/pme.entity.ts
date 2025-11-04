import { Establecimiento } from 'src/establecimientos/entities/establecimiento.entity';
import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('pme')
export class Pme {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dimension: string;

  @Column()
  descripcionAccion: string;

  @ManyToOne(() => Establecimiento, (e) => e.pmes)
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @OneToMany(() => SolicitudCompra, (s) => s.pme)
  solicitudes: SolicitudCompra[];
}
