import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  monto_final_compra?: string; // <-- AÑADIR

  @IsOptional()
  @IsString() // O IsDateString
  fecha_publicacion?: string;

  @IsOptional()
  @IsString()
  fecha_apertura?: string;

  @IsOptional()
  @IsString()
  fecha_cierre?: string;

  @IsOptional()
  @IsString()
  com_observaciones?: string;

  @IsBoolean()
  @IsNotEmpty()
  esFraccionada: boolean;
}
