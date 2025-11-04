import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fondo } from './entities/fondo.entity';
import { FondosController } from './fondos.controller';
import { FondosService } from './fondos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Fondo])],
  controllers: [FondosController],
  providers: [FondosService],
  exports: [TypeOrmModule, FondosService],
})
export class FondosModule {}
