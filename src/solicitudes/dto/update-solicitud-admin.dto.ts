import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from '@nestjs/class-transformer';
import { CuentaMontoDto } from './update-finanzas.dto';

export class UpdateSolicitudAdminDto {
  // --- Campos de Texto / Básicos ---
  @IsOptional()
  @IsString()
  numero_solicitud?: string;

  @IsOptional()
  @IsString()
  materia_solicitud?: string;

  @IsOptional()
  @IsString()
  fundamentos_solicitud?: string;

  @IsOptional()
  @IsString()
  monto_estimado?: string; // Se recibe como string para decimales grandes

  @IsOptional()
  @IsString()
  observaciones_considerar?: string;

  @IsOptional()
  @IsString()
  id_convenio_marco?: string;

  // --- Relaciones (IDs) ---
  @IsOptional()
  @IsNumber()
  estado_solicitud_id?: number;

  @IsOptional()
  @IsNumber()
  area_revisora_id?: number;

  @IsOptional()
  @IsNumber()
  fondo_id?: number;

  @IsOptional()
  @IsNumber()
  modalidad_id?: number;

  @IsOptional()
  @IsNumber()
  establecimiento_id?: number;

  @IsOptional()
  @IsNumber()
  pme_id?: number;

  // --- Asignaciones de Usuarios ---
  @IsOptional()
  @IsNumber()
  comprador_asignado_id?: number;

  @IsOptional()
  @IsNumber()
  fin_asignado_id?: number;

  // --- Datos de Gestión de Compra ---
  @IsOptional()
  @IsString()
  orden_compra?: string;

  @IsOptional()
  @IsString()
  numero_cotizacion?: string;

  @IsOptional()
  @IsString()
  numero_licitacion?: string;
  
  @IsOptional()
  @IsString()
  fecha_publicacion?: string;

  @IsOptional()
  @IsString()
  fecha_apertura?: string;

  @IsOptional()
  @IsString()
  fecha_cierre?: string;

  @IsOptional()
  @IsString()
  comentarios_orden_compra?: string;

  @IsOptional()
  @IsString()
  com_observaciones?: string;
  
  @IsOptional()
  @IsString()
  monto_final_compra?: string;

  @IsOptional()
  @IsString()
  jefa_observaciones?: string;

  @IsOptional()
  @IsBoolean()
  fraccionamiento_compra?: boolean;

  // --- Finanzas / Cuentas ---
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CuentaMontoDto)
  cuentas?: CuentaMontoDto[];

  @IsOptional()
  @IsNumber()
  fin_centro_costo_id?: number;

  @IsOptional()
  @IsNumber()
  solicitante_id?: number;
}