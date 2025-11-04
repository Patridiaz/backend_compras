import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Establecimiento } from 'src/establecimientos/entities/establecimiento.entity';
import { AreaRevisora } from 'src/areas/entities/area.entity';
import { Prioridad } from 'src/prioridades/entities/prioridad.entity';
import { EstadoSolicitud } from 'src/estados/entities/estado-solicitud.entity';
import { Fondo } from 'src/fondos/entities/fondo.entity';
import { Modalidad } from 'src/modalidades/entities/modalidad.entity';
import { Pme } from 'src/pme/entities/pme.entity';
import { CuentaPresupuestaria } from 'src/cuentas/entities/cuenta-presupuestaria.entity';
import { ObservacionArea } from 'src/observaciones/entities/observacion-area.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { CentroCosto } from 'src/centro-costo/entities/centro-costo.entity';

@Entity('solicitudes_compra')
export class SolicitudCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'nombre_solicitante_id' })
  solicitante: Usuario;

  @ManyToOne(() => Establecimiento, (e) => e.solicitudes)
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @CreateDateColumn({
    type: 'datetime',
    name: 'fecha_solicitud',
    default: () => 'GETDATE()', 
  })
  fecha_solicitud: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', nullable: true })
  updated_at: Date | null;

  @Column()
  materia_solicitud: string;

  @Column()
  fundamentos_solicitud: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_estimado: string;


  @ManyToOne(() => AreaRevisora, (a) => a.solicitudes)
  @JoinColumn({ name: 'area_revisora_id' })
  areaRevisora: AreaRevisora;


  @ManyToOne(() => EstadoSolicitud, e => e.solicitudes)
  @JoinColumn({ name: 'estado_solicitud_id' })
  estadoSolicitud: EstadoSolicitud;

  @ManyToOne(() => Fondo, (f) => f.solicitudes)
  @JoinColumn({ name: 'fondo_id' })
  fondo: Fondo;

  @ManyToOne(() => Modalidad, (m) => m.solicitudes)
  @JoinColumn({ name: 'modalidad_id' })
  modalidad: Modalidad;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  id_convenio_marco?: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  cotizacion: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  terminos_de_referencia: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  bt: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  req_compra_agil: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  nominas: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, default: null })
  espec_productos: string | null;


  @ManyToOne(() => Pme, (p) => p.solicitudes, { nullable: true })
  @JoinColumn({ name: 'pme_id' })
  pme?: Pme | null;

  /* ===================== CAMPOS FINANZAS ===================== */
  // QUIÉN TOMA LA SOLICITUD EN FINANZAS
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'fin_asignado_id' })
  finAsignado: Usuario;

  // CUENTA PRESUPUESTARIA + DESCRIPCIÓN
  @ManyToOne(() => CuentaPresupuestaria, c => c.solicitudes, { nullable: true })
  @JoinColumn({ name: 'fin_cuenta_id' }) // <-- El nombre de la columna se define aquí
  finCuenta: CuentaPresupuestaria | null; // <-- La propiedad se llama finCuenta (el objeto)

  // Si mantienes estos (compatibilidad), márcalos como legacy:
  @ManyToOne(() => CentroCosto, (cc) => cc.solicitudes, { nullable: true })
  @JoinColumn({ name: 'fin_centro_costo_id' }) // Nombre de la columna FK en la BD
  finCentroCosto: CentroCosto | null;


  /* ===================== CAMPOS COMPRADOR ===================== */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'comprador_asignado_id' })
  compradorAsignado: Usuario;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  orden_compra?: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  numero_cotizacion?: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  numero_licitacion?: string | null; 

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  comentarios_orden_compra?: string | null; 

   /* ===================== CAMPOS JEFA DEM ===================== */
  // QUIÉN APROBÓ O RECHAZÓ EL PROCESO FINAL
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'jefa_dem_asignado_id' })
  jefaDemAsignado: Usuario | null; // Nuevo: La persona que aprueba/rechaza

  // RESULTADO FINAL
  @ManyToOne(() => EstadoSolicitud, { nullable: true })
  @JoinColumn({ name: 'jefa_dem_aprobacion_id' }) // Usamos el mismo estado para registrar el resultado
  jefaDemAprobacion: EstadoSolicitud | null; // Nuevo: 9 (Aprobada) o 5 (Rechazada)

  // FECHA DE APROBACIÓN/RECHAZO
  @Column({ type: 'datetime', name: 'jefa_dem_fecha', nullable: true })
  jefaDemFecha: Date | null; // Nuevo

  /* ===================== CAMPOS AREA REVISORA ===================== */
  
  @OneToMany(() => ObservacionArea, o => o.solicitud, { cascade: true })
  observacionesArea: ObservacionArea[];

  // QUIÉN TOMA LA SOLICITUD EN EL ÁREA REVISORA
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'area_asignado_id' })
  areaAsignado: Usuario | null;



}
