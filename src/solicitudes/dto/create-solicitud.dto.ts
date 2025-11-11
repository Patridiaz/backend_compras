import { Transform } from '@nestjs/class-transformer';
import {IsBoolean, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateSolicitudDto {
  @IsNumber() nombre_solicitante_id: number;
  @IsNumber() establecimiento_id: number;

  @IsString() @Length(3, 255) materia_solicitud: string;
  @IsString() fundamentos_solicitud: string;

  // MSSQL decimal -> usa string para evitar problemas de precisión
  @IsString() monto_estimado: string;

  @IsNumber() area_revisora_id: number;
  @IsNumber() fondo_id: number;
  @IsNumber() modalidad_id: number;

  @IsOptional() @IsString() cotizacion?: string; 
  @IsOptional() @IsString() terminos_de_referencia?: string; 
  @IsOptional() @IsString() bt?: string; 
  @IsOptional() @IsString() req_compra_agil?: string; 
  @IsOptional() @IsString() nominas?: string; 
  @IsOptional() @IsString() espec_productos?: string;
  @IsOptional() @IsString() observaciones?: string;

  @IsOptional() @IsString() id_convenio_marco?: string;
  // PME (si lo usas)
  @IsOptional() @IsNumber() pme_id?: number;
}