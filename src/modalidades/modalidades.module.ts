import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modalidad } from './entities/modalidad.entity';
import { ModalidadesController } from './modalidades.controller';
import { ModalidadesService } from './modalidades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Modalidad])],
  controllers: [ModalidadesController],
  providers: [ModalidadesService],
  exports: [TypeOrmModule, ModalidadesService],
})
export class ModalidadesModule {}
