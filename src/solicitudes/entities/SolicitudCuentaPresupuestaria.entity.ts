import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm'; // 👈 Añade 'Column'
import { SolicitudCompra } from './solicitud-compra.entity';
import { CuentaPresupuestaria } from 'src/cuentas/entities/cuenta-presupuestaria.entity';
import { CentroCosto } from 'src/centro-costo/entities/centro-costo.entity';

@Entity('solicitudes_cuentas_presupuestarias')
export class SolicitudCuentaPresupuestaria {

  @PrimaryGeneratedColumn()
  id: number;

  // Relación Muchos a Uno con SolicitudCompra
  @ManyToOne(() => SolicitudCompra, solicitud => solicitud.cuentasPresupuestarias)
  @JoinColumn({ name: 'solicitud_compra_id' })
  solicitud: SolicitudCompra;

  // Relación Muchos a Uno con CuentaPresupuestaria
  @ManyToOne(() => CuentaPresupuestaria,{ eager: true })
  @JoinColumn({ name: 'cuenta_presupuestaria_id' })
  cuentaPresupuestaria: CuentaPresupuestaria;

  @ManyToOne(() => CentroCosto, { eager: true, nullable: true })
  @JoinColumn({ name: 'centro_costo_id' })
  centroCosto: CentroCosto;

  // --- 👇 AÑADIR ESTA COLUMNA ---
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoImputado: string; // O number, pero string es más seguro para decimales
}