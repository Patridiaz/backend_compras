import { Controller, Get, Query, ParseIntPipe, Post, Body, UseGuards } from '@nestjs/common';
import { PmeService } from './pme.service';
import { Pme } from './entities/pme.entity';
import { Public } from 'src/auth/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pme')
export class PmeController {
  constructor(private readonly pmeService: PmeService) {}

  @Public()
  @Get()
  async findByEstablecimiento(
    @Query('establecimientoId', new ParseIntPipe({ optional: true })) establecimientoId?: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ): Promise<Pme[]> {
    if (establecimientoId) {
      return this.pmeService.findByEstablecimiento(establecimientoId, anio);
    } else {
      return this.pmeService.findAll();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('fix-db')
  fixDb() {
    return this.pmeService.fixDb();
  }

  @UseGuards(JwtAuthGuard)
  @Post('duplicar-periodo')
  duplicarPeriodo(@Body() body: { origen: number; destino: number }) {
    return this.pmeService.duplicarAnio(body.origen, body.destino);
  }
}