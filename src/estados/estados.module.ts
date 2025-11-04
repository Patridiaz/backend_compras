import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoSolicitud } from './entities/estado-solicitud.entity';
import { EstadosService } from './estados.service';
import { EstadosController } from './estados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoSolicitud])],
  controllers: [EstadosController],
  providers: [EstadosService],
  exports: [TypeOrmModule, EstadosService],
})
export class EstadosModule {}
