import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCentroCostoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  // Si añades código:
  // @IsString()
  // @MaxLength(50)
  // @IsOptional() // O IsNotEmpty si es obligatorio
  // codigo?: string;
}