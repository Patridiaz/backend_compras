import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaPresupuestaria } from './entities/cuenta-presupuestaria.entity';
import { CuentasService } from './cuentas.service';
import { CuentasController } from './cuentas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaPresupuestaria])],
  providers: [CuentasService],
  controllers: [CuentasController],
  exports: [TypeOrmModule], // por si la usas desde otros módulos
})
export class CuentasModule {}
