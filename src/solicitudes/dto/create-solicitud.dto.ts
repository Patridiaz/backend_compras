import { Transform, Type } from '@nestjs/class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateSolicitudDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nombre_solicitante_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  establecimiento_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodo?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodo_presupuestario?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anio?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsString()
  numero_solicitud?: string;

  @IsOptional()
  @IsString()
  fecha_solicitud?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  materia_solicitud?: string;

  @IsOptional()
  @IsString()
  fundamentos_solicitud?: string;

  @IsOptional()
  @IsString()
  observaciones_considerar?: string;

  // MSSQL decimal -> usa string para evitar problemas de precisión
  @IsOptional()
  @IsString()
  monto_estimado?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  area_revisora_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fondo_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  modalidad_id?: number;

  @IsOptional()
  @IsString()
  cotizacion?: string; 

  @IsOptional()
  @IsString()
  terminos_de_referencia?: string; 

  @IsOptional()
  @IsString()
  bt?: string; 

  @IsOptional()
  @IsString()
  req_compra_agil?: string; 

  @IsOptional()
  @IsString()
  nominas?: string; 

  @IsOptional()
  @IsString()
  espec_productos?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  id_convenio_marco?: string;

  // PME (si lo usas)
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pme_id?: number;
}