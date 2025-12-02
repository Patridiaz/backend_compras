import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
import { SolicitudCuentaPresupuestaria } from 'src/solicitudes/entities/SolicitudCuentaPresupuestaria.entity';

@Entity('cuentas_presupuestarias')
@Index(['codigo'], { unique: true })
export class CuentaPresupuestaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 32 })
  codigo: string; // ej: 22.01.003

  @Column({ type: 'nvarchar', length: 255 })
  descripcion: string;
  
// ✅ CAMBIO: Apunta a la entidad intermedia
  @OneToMany(() => SolicitudCuentaPresupuestaria, (sc) => sc.cuentaPresupuestaria)
  solicitudesRelaciones: SolicitudCuentaPresupuestaria[]; // Usar un nombre que refleje que es la relación
}
