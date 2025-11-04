import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { Usuario } from './usuario.entity';
import { AreaRevisora } from 'src/areas/entities/area.entity';
import { RolUser } from './rol-user.entity';

@Module({
  imports: [
    // ✅ CORRECCIÓN: Todas las entidades ahora se registran juntas en la única conexión por defecto.
    TypeOrmModule.forFeature([
      Usuario, 
      RolUser,
      AreaRevisora, // Se incluye aquí porque el servicio la necesita.
    ]),
    
    // ❌ Se eliminó la línea con 'ticketsConnection'.
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}