import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 🚨 Necesario
import { UtmController } from './utm.controller';
import { UtmService } from './utm.service';
import { UtmValue } from './utm-value.entity'; // 🚨 Necesario

@Module({
    imports: [
        // 🚨 SOLUCIÓN: Habilitar el repositorio de UtmValue en este módulo
        TypeOrmModule.forFeature([UtmValue]),
    ],
    controllers: [UtmController],
    providers: [UtmService],
    exports: [UtmService], 
})
export class UtmModule {}