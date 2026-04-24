import { Module } from '@nestjs/common';
import { MercadoPublicoService } from './mercado-publico.service';

@Module({
  providers: [MercadoPublicoService],
  exports: [MercadoPublicoService],
})
export class MercadoPublicoModule {}
