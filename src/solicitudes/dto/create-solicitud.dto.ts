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

  @IsOptional() @IsString() id_convenio_marco?: string;
  // PME (si lo usas)
  @IsOptional() @IsNumber() pme_id?: number;
}