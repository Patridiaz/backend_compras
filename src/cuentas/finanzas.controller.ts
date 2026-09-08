import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CuentasService } from './cuentas.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('finanzas')
export class FinanzasController {
  constructor(private readonly service: CuentasService) {}

  @Get('dashboard')
  async getDashboard(
    @Request() req,
    @Query('anio') anio?: string,
    @Query('periodo') periodo?: string,
  ) {
    const roles = req.user?.roles || [];
    const esFinanzas = roles.some(
      (r: any) =>
        (typeof r === 'string' && r.toUpperCase() === 'FINANZAS') ||
        (typeof r === 'object' && r?.nombre?.toUpperCase() === 'FINANZAS') ||
        (typeof r === 'object' && r?.id === 6),
    );
    const esAdmin = roles.some(
      (r: any) =>
        (typeof r === 'string' && r.toLowerCase() === 'admin') ||
        (typeof r === 'object' && r?.nombre?.toLowerCase() === 'admin'),
    );

    if (!esFinanzas && !esAdmin) {
      throw new ForbiddenException('Acceso exclusivo para el área de Finanzas.');
    }

    const year = anio ? +anio : (periodo ? +periodo : new Date().getFullYear());
    return this.service.obtenerDashboardFinanzas(year);
  }

  @Get('dashboard/resumen')
  async getDashboardResumen(
    @Request() req,
    @Query('anio') anio?: string,
    @Query('periodo') periodo?: string,
  ) {
    const roles = req.user?.roles || [];
    const esFinanzas = roles.some(
      (r: any) =>
        (typeof r === 'string' && r.toUpperCase() === 'FINANZAS') ||
        (typeof r === 'object' && r?.nombre?.toUpperCase() === 'FINANZAS') ||
        (typeof r === 'object' && r?.id === 6),
    );
    const esAdmin = roles.some(
      (r: any) =>
        (typeof r === 'string' && r.toLowerCase() === 'admin') ||
        (typeof r === 'object' && r?.nombre?.toLowerCase() === 'admin'),
    );

    if (!esFinanzas && !esAdmin) {
      throw new ForbiddenException('Acceso exclusivo para el área de Finanzas.');
    }

    const year = anio ? +anio : (periodo ? +periodo : new Date().getFullYear());
    return this.service.obtenerEstadoPresupuestario(year);
  }
}
