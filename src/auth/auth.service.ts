import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    console.log('--- LOGIN TEST ---');
    console.log(`1. Email received: ${email}`);

    // 1. Usa el UsuariosService para encontrar al usuario
    const user = await this.usuariosService.findByEmail(email);

    if (!user) {
      console.log('2. ❌ ERROR: User not found.');
      throw new UnauthorizedException('Credenciales inválidas');
    }
    console.log(`3. DB Hash: ${user.password.substring(0, 10)}...`);

    // 2. Usa el UsuariosService para validar la contraseña
    const isMatch = await this.usuariosService.validatePassword(pass, user.password);
    console.log(`4. isMatch result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { password, ...result } = user;
    return result; // Devuelve el usuario sin la contraseña
  }

  /**
   * Crea el JWT (token de acceso) para un usuario ya validado.
   */
async login(user: any) {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles.map(rol => rol.nombre),
    nombre: user.name, 
  };
  
  const { password, ...userResult } = user;

  return {
    access_token: this.jwtService.sign(payload),
    user: userResult,
  };
}

  /**
   * Registra un nuevo usuario, delegando la creación al UsuariosService.
   */
  async register(registerDto: RegisterDto): Promise<any> {
    // 1. Llama al método 'create' del UsuariosService, que ahora contiene toda la lógica.
    const newUser = await this.usuariosService.create(registerDto);

    // 2. Si la creación fue exitosa, genera un token y lo devuelve.
    return this.login(newUser);
  }
}