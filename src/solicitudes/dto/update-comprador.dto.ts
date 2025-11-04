import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCompradorDto {
  @IsOptional()
  @IsString()
  orden_compra?: string;

  @IsOptional()
  @IsString()
  numero_cotizacion?: string;

  @IsOptional()
  @IsString()
  numero_licitacion?: string; // <-- AÑADIR

  @IsOptional()
  @IsString()
  comentarios_orden_compra?: string; // <-- AÑADIR

  @IsOptional()
  @IsString()
  com_observaciones?: string;
}
