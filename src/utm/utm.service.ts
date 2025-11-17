// src/utm/utm.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtmValue } from './utm-value.entity'; // 🚨 Importar la nueva entidad

@Injectable()
export class UtmService {
    // 🚨 AHORA SÍ: Inyectar el repositorio
    constructor(
        @InjectRepository(UtmValue) // Usa la entidad formal
        private utmRepository: Repository<UtmValue>,
    ) {}

    async getAllValues(): Promise<UtmValue[]> {
        
        // --- Lógica de Base de Datos ---
        // Usamos find() para obtener todas las filas.
        // Ordenamos por año y luego por mes de forma descendente.
        const allUtmValues = await this.utmRepository.find({
            order: {
                year: 'DESC',
                month: 'DESC',
            },
            // Aseguramos que los valores sean devueltos como números flotantes
            // (Si TypeORM está configurado correctamente con el transformer para 'decimal').
        }); 

        return allUtmValues;
    }
    
    async getLatestValue(): Promise<number> {
        
        // --- Lógica de Base de Datos para SQL Server (TypeORM Query Builder) ---
        const latestUtm = await this.utmRepository.createQueryBuilder('utm')
            .select('utm.value', 'value')
            .orderBy('utm.year', 'DESC')
            .addOrderBy('utm.month', 'DESC')
            .getRawOne(); // getRawOne es más adecuado para SELECT de una sola columna sin mapeo completo

        // El resultado de getRawOne es un objeto { value: '69542.00' }
        return latestUtm ? parseFloat(latestUtm.value) : 0;
    }
}