import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCuentaDto {
  @IsString()
  @Length(1, 32)
  codigo: string;

  @IsString()
  @Length(3, 255)
  descripcion: string;

  @IsNumber()
  @Min(0, { message: 'El monto debe ser igual o mayor a 0' })
  @IsOptional() // Opcional si permites crear cuentas con monto 0 por defecto
  monto?: number;

}
