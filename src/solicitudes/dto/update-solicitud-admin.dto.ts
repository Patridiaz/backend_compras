import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateSolicitudAdminDto {
  // --- Campos de Texto / Básicos ---
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
  observaciones?: string;

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
  numero_licitacion?: string;
  
  @IsOptional()
  @IsString()
  comentarios_orden_compra?: string;
  
  @IsOptional()
  @IsString()
  monto_final_compra?: string;
}