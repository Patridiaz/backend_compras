import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentroCostoService } from './centro-costo.service';
import { CentroCostoController } from './centro-costo.controller';
import { CentroCosto } from './entities/centro-costo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CentroCosto])], // Registra la entidad
  controllers: [CentroCostoController],
  providers: [CentroCostoService],
  exports: [CentroCostoService] // Exporta el servicio si otros módulos lo necesitan
})
export class CentroCostoModule {}