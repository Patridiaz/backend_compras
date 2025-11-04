import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreatePrioridadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
