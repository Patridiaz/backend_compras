import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateEstablecimientoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
