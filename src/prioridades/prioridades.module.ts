import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prioridad } from './entities/prioridad.entity';
import { PrioridadesController } from './prioridades.controller';
import { PrioridadesService } from './prioridades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prioridad])],
  controllers: [PrioridadesController],
  providers: [PrioridadesService],
  exports: [TypeOrmModule, PrioridadesService],
})
export class PrioridadesModule {}
