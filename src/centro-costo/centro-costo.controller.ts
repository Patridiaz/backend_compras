import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards // Añade UseGuards si tienes autenticación/autorización
} from '@nestjs/common';
import { CentroCostoService } from './centro-costo.service';
import { CreateCentroCostoDto } from './dto/create-centro-costo.dto';
import { UpdateCentroCostoDto } from './dto/update-centro-costo.dto';

@Controller('centros-costo') // Endpoint base: /api/centros-costo
// @UseGuards(JwtAuthGuard) // Aplicar guardia globalmente si es necesario
export class CentroCostoController {
  constructor(private readonly service: CentroCostoService) {}

  @Post()
  // @Roles('admin') // Ejemplo: Solo admin puede crear
  // @UseGuards(RolesGuard)
  create(@Body() dto: CreateCentroCostoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  // @Roles('admin') // Ejemplo
  // @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCentroCostoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  // @Roles('admin') // Ejemplo
  // @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id); // Retorna Promise<void>
  }
}