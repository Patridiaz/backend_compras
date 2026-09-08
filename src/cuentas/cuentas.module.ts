import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaPresupuestaria } from './entities/cuenta-presupuestaria.entity';
import { CuentasService } from './cuentas.service';
import { CuentasController } from './cuentas.controller';
import { FinanzasController } from './finanzas.controller';
import { SolicitudCuentaPresupuestaria } from 'src/solicitudes/entities/SolicitudCuentaPresupuestaria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaPresupuestaria, SolicitudCuentaPresupuestaria])],
  providers: [CuentasService],
  controllers: [CuentasController, FinanzasController],
  exports: [TypeOrmModule], // por si la usas desde otros módulos
})
export class CuentasModule {}
