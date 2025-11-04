import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class RevisarSolicitudDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  observacion?: string;

  @IsOptional()
  @IsNumber()
  nueva_area_revisora_id?: number;
}
