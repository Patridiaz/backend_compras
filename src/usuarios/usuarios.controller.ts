import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  async findAll() {
    // Llamamos a un nuevo método en el servicio
    return this.service.findAllAdmin();
  }

  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(Number(id), dto.password);
  }

  @Get('roles')
  getRoles() {
    return this.service.getAvailableRoles();
  }

  @Patch(':id') // <-- Captura /usuarios/:id
  async update(
    @Param('id') id: string,
    @Body() updateDto: { roleIds?: number[]; name?: string }, // Aquí defines lo que esperas
  ) {
    // Convierte el ID a número (si no lo hace automáticamente NestJS)
    const userId = parseInt(id, 10);
    
    // Delega al servicio para actualizar los roles (y potencialmente el nombre)
    return this.service.update(userId, updateDto); 
  }
}
