import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport'; // ✅ 1. Importa PassportModule

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module'; // ✅ 2. Importa el módulo que provee los servicios de usuario
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Para poder leer variables de entorno como JWT_SECRET
    ConfigModule,

    // Para poder usar la estrategia JWT y los guardias de autenticación
    PassportModule,

    // ✅ Importa el módulo que sabe cómo construir UsuariosService.
    // Esta es la línea más importante para la correcta inyección de dependencias.
    UsuariosModule,

    // Configuración del módulo JWT para crear y validar tokens
    JwtModule.registerAsync({
      imports: [ConfigModule], // Asegura que ConfigService esté disponible aquí
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES') || '1d' },
      }),
    }),

    // ❌ ELIMINADO: TypeOrmModule.forFeature(...).
    // Esta responsabilidad pertenece exclusivamente al UsuariosModule.
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}