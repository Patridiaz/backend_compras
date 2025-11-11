// En: src/areas/entities/area.entity.ts
import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('areas_revisoras')
export class AreaRevisora {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @OneToMany(() => SolicitudCompra, (s) => s.areaRevisora)
  solicitudes: SolicitudCompra[];

}