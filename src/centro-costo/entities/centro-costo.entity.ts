import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('centros_costo') // Nombre de la tabla en la BD
export class CentroCosto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150, nullable: false }) // Coincide con NVARCHAR(150) NOT NULL
  nombre: string;

  // Relación inversa (opcional, pero útil si necesitas navegar desde CentroCosto a Solicitudes)
  @OneToMany(() => SolicitudCompra, (solicitud) => solicitud.finCentroCosto)
  solicitudes: SolicitudCompra[];
}