import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private usuarios: UsuariosService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // La lógica de NestJS llama a validateUser y devuelve el JWT y el perfil.
    const user = await this.auth.validateUser(
      loginDto.email,
      loginDto.password,
    );

    // Asumiendo que tu AuthService tiene un método login final que crea el JWT:
    return this.auth.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.auth.register(registerDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    // El guardián JwtAuthGuard ya ha validado el token
    // y ha adjuntado el payload del usuario a la petición.
    const userPayload = req.user; // Busca el perfil completo del usuario en la base de datos usando el ID del token
    const userProfile = await this.usuarios.findOneByIdWithRelations(
      userPayload.sub,
    );
    if (userProfile) {
      // Elimina la contraseña antes de devolver el objeto de usuario
      const { password, ...result } = userProfile;
      return result;
    }
    return null;
  }


}
