import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
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

  @Column({ type: 'int', default: 2026 }) // Año del PME (sistema parte desde 2026)
  periodo: number;

  @ManyToOne(() => Establecimiento, (e) => e.pmes)
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @OneToMany(() => SolicitudCompra, (s) => s.pme)
  solicitudes: SolicitudCompra[];
}
