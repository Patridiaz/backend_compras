import { Controller, Get, Query, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { PmeService } from './pme.service';
import { Pme } from './entities/pme.entity';
import { Public } from 'src/auth/public.decorator';

@Controller('pme')
export class PmeController {
  constructor(private readonly pmeService: PmeService) {}

  @Public() // ✅ Now this works!
  @Get()
  async findByEstablecimiento(
    @Query('establecimientoId', new ParseIntPipe({ optional: true }))
    establecimientoId?: number,
  ): Promise<Pme[]> {
    if (establecimientoId) {
      return this.pmeService.findByEstablecimiento(establecimientoId);
    } else {
      return this.pmeService.findAll();
    }
  }
}