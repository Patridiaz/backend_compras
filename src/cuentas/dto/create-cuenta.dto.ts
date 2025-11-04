import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';
import type { TipoCuenta } from '../entities/cuenta-presupuestaria.entity';

export class CreateCuentaDto {
  @IsString()
  @Length(1, 32)
  codigo: string;

  @IsString()
  @Length(3, 255)
  descripcion: string;

  @IsString()
  @IsIn(['GASTO', 'INGRESO', 'OTRA'])
  tipo: TipoCuenta;
}
