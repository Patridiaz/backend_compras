import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AreaRevisora } from '../../areas/entities/area.entity';
import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
import { Usuario } from '../../usuarios/usuario.entity'; // ✅ 1. Importa Usuario

@Entity('observaciones_area')
export class ObservacionArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 'MAX' })
  observacion: string;

  // ✅ 2. Añade la relación con el usuario que hace la observación
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => AreaRevisora)
  @JoinColumn({ name: 'area_revisora_id' })
  areaRevisora: AreaRevisora;

  @ManyToOne(() => SolicitudCompra, (s) => s.observacionesArea)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudCompra;

  @CreateDateColumn({ type: 'datetime', default: () => 'GETDATE()' })
  fecha: Date;
}