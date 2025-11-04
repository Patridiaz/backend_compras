import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateFondoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
