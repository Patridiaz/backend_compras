import { SolicitudCompra } from 'src/solicitudes/entities/solicitud-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('modalidades')
export class Modalidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  nombre: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: false }) // o pon default: '' si quieres
  descripcion: string;

  // Suele ser mejor manejar decimales como string en TypeORM para no perder precisión
  @Column({ type: 'nvarchar', length: 1000, nullable: false })
  monto_maximo: string;

  @OneToMany(() => SolicitudCompra, (s) => s.modalidad)
  solicitudes: SolicitudCompra[];
}
