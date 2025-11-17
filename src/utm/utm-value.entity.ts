// src/utm/utm-value.entity.ts

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// Asumo que estás usando TypeORM con SQL Server.

@Entity('utm_values') // El nombre de la tabla en SQL Server es 'utm_values'
export class UtmValue {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    year: number;

    @Column()
    month: number;

    // Usamos 'decimal' para el valor monetario
    @Column({ type: 'decimal', precision: 10, scale: 2 }) 
    value: number;

    @Column({ name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'datetime', nullable: true })
    updatedAt: Date;
}