import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException
} from '@nestjs/common';
import { CuentasService } from './cuentas.service';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { UpdateCuentaDto } from './dto/update-cuenta.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly service: CuentasService) {}

  @Post()
  create(@Body() dto: CreateCuentaDto) {
    return this.service.create(dto);
  }

  @Get('fix-index')
  fixIndex() {
    return this.service.fixIndex();
  }

  @Get('fix-db')
  fixDb() {
    return this.service.fixDb();
  }

  @Get()
  findAll(@Query('q') q?: string, @Query('anio') anio?: string, @Query('periodo') periodo?: string) {
    const year = anio ? +anio : (periodo ? +periodo : undefined);
    return this.service.findAll(q, year);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCuentaDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  // ✅ ENDPOINT DASHBOARD RESUMEN
  @Get('dashboard/resumen')
  async getDashboardPresupuesto(@Request() req, @Query('anio') anio?: string, @Query('periodo') periodo?: string) {
    const roles = req.user.roles || [];
    const esFinanzas = roles.some((r: any) => 
        (typeof r === 'string' && r === 'FINANZAS') || 
        (typeof r === 'object' && r.nombre === 'FINANZAS') ||
        (typeof r === 'object' && r.id === 6)
    );
    
    const esAdmin = roles.some((r: any) => r === 'admin' || r.nombre === 'admin');

    if (!esFinanzas && !esAdmin) {
       throw new ForbiddenException('Acceso exclusivo para el área de Finanzas.');
    }

    const year = anio ? +anio : (periodo ? +periodo : new Date().getFullYear());
    return this.service.obtenerEstadoPresupuestario(year);
  }

  // ✅ ENDPOINT DASHBOARD COMPLETO (Métricas y Cuentas)
  @Get('dashboard')
  async getDashboardCompleto(@Request() req, @Query('anio') anio?: string, @Query('periodo') periodo?: string) {
    const roles = req.user.roles || [];
    const esFinanzas = roles.some((r: any) => 
        (typeof r === 'string' && r === 'FINANZAS') || 
        (typeof r === 'object' && r.nombre === 'FINANZAS') ||
        (typeof r === 'object' && r.id === 6)
    );
    
    const esAdmin = roles.some((r: any) => r === 'admin' || r.nombre === 'admin');

    if (!esFinanzas && !esAdmin) {
       throw new ForbiddenException('Acceso exclusivo para el área de Finanzas.');
    }

    const year = anio ? +anio : (periodo ? +periodo : new Date().getFullYear());
    return this.service.obtenerDashboardFinanzas(year);
  }

  @Get(':id/movimientos')
  async getMovimientos(@Param('id') id: string) {
    return this.service.obtenerMovimientosCuenta(+id);
  }

  // ✅ Obtener lista de años disponibles
  @Get('dashboard/anios')
  async getAnios() {
    return this.service.obtenerAniosDisponibles();
  }

  @Post('duplicar-anualidad')
  async duplicarAnio(@Body() body: { origen: number; destino: number }) {
    return this.service.duplicarAnio(Number(body.origen), Number(body.destino));
  }
}
