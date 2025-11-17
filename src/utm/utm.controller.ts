// src/utm/utm.controller.ts

import { Controller, Get, HttpStatus } from '@nestjs/common';
import { UtmService } from './utm.service';
import { UtmValue } from './utm-value.entity';

// Interfaz para la respuesta de un solo valor (la dejamos como estaba)
interface UtmSingleResponse {
    value: number;
}

// 🚨 Nuevo Interface para la lista de valores
interface UtmListResponse {
    values: UtmValue[];
}

@Controller('utm') // Base path: /utm
export class UtmController {
    constructor(private readonly utmService: UtmService) {}

    @Get('latest') // Full path: /utm/latest
    async getLatestUtm(): Promise<UtmSingleResponse> {
        const value = await this.utmService.getLatestValue();

        return { value };
    }
    
    @Get('all') // Full path: /utm/all
        async getAllUtm(): Promise<UtmListResponse> {
            const values = await this.utmService.getAllValues();
            return { values };
        }
}