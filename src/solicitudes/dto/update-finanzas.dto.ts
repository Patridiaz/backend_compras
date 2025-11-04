import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsNumberString,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateFinanzasDto {
  @IsOptional()
  @IsNumber()
  fin_cuenta_id?: number | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  fin_centro_costo_id?: number | null; // Permite null para desasignar

}
