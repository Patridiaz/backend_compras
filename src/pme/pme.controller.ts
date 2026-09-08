import { Controller, Get, Query, ParseIntPipe, Param, Post, Body, UseGuards } from '@nestjs/common';
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
    @Query('periodo', new ParseIntPipe({ optional: true })) periodo?: number,
  ): Promise<Pme[]> {
    const year = anio || periodo;
    if (establecimientoId) {
      return this.pmeService.findByEstablecimiento(establecimientoId, year);
    } else {
      return this.pmeService.findAll(year);
    }
  }

  @Public()
  @Get('establecimiento/:id')
  async findByEstablecimientoParam(
    @Param('id', ParseIntPipe) id: number,
    @Query('anio') anio?: string,
    @Query('periodo') periodo?: string,
  ): Promise<Pme[]> {
    const year = anio ? parseInt(anio, 10) : (periodo ? parseInt(periodo, 10) : undefined);
    return this.pmeService.findByEstablecimiento(id, year);
  }

  @UseGuards(JwtAuthGuard)
  @Get('fix-db')
  fixDb() {
    return this.pmeService.fixDb();
  }

  @UseGuards(JwtAuthGuard)
  @Post('duplicar-periodo')
  duplicarPeriodo(@Body() body: { origen: number; destino: number }) {
    return this.pmeService.duplicarAnio(Number(body.origen), Number(body.destino));
  }
}