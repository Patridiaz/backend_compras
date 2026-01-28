import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SolicitudCompra } from '../../solicitudes/entities/solicitud-compra.entity';

@Entity('solicitud_anexos')
export class Anexo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre_original: string;

  @Column()
  nombre_archivo: string; // Nombre en el disco/storage

  @Column({ nullable: true })
  mimetype: string;

  @Column({ type: 'int', nullable: true })
  size: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => SolicitudCompra, (solicitud) => solicitud.anexos, {
    onDelete: 'CASCADE', // Si se borra la solicitud, se borran los anexos
    orphanedRowAction: 'delete'
  })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudCompra;
}
