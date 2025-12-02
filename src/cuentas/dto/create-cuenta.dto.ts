import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCuentaDto {
  @IsString()
  @Length(1, 32)
  codigo: string;

  @IsString()
  @Length(3, 255)
  descripcion: string;

}
