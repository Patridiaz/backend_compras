import { Pme } from 'src/pme/entities/pme.entity';
import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('Establecimiento')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => SolicitudCompra, (s) => s.establecimiento)
  solicitudes: SolicitudCompra[];

  @OneToMany(() => Pme, (p) => p.establecimiento)
  pmes: Pme[];
}
