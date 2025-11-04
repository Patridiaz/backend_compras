import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';

export type TipoCuenta = 'MATRIZ' | 'DETALLE';

@Entity('cuentas_presupuestarias')
@Index(['codigo'], { unique: true })
export class CuentaPresupuestaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 32 })
  codigo: string; // ej: 22.01.003

  @Column({ type: 'nvarchar', length: 255 })
  descripcion: string;

  @Column({ type: 'nvarchar', length: 16 })
  tipo: TipoCuenta; // 'GASTO' | 'INGRESO' | 'OTRA'

  @OneToMany(() => SolicitudCompra, (s) => s.finCuenta)
  solicitudes: SolicitudCompra[];
}
