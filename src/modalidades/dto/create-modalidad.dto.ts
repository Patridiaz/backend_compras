// modalidades/dto/create-modalidad.dto.ts
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class CreateModalidadDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  descripcion: string;

  // Si prefieres enviar number desde FE, usa IsNumber y transforma a string en el service
  @IsString()
  @IsNotEmpty()
  monto_maximo: string; // decimal como string
}
