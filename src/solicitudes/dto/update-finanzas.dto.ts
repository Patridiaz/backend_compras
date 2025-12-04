import { Type } from '@nestjs/class-transformer';
import { 
  IsNumber, IsOptional, IsString, IsInt, Min, 
  IsArray, ArrayMinSize, ValidateNested, Matches, // 👈 Asegúrate de importar Matches y ValidateNested
  IsBoolean,
  IsNotEmpty
} from 'class-validator';

// --- 👇 AÑADIR ESTA CLASE DTO INTERNA ---
// (Esta clase valida los objetos que vienen en el array 'cuentas' del FormArray)
export class CuentaMontoDto {
  @IsInt()
  @Type(() => Number)
  cuentaId: number;

  @IsString()
  // Valida "150000" o "150000,50" o "150000.50"
  @Matches(/^[0-9]+([,.][0-9]{1,2})?$/, { 
    message: 'El monto debe ser un número válido (ej: 150000 o 150000,50)'
  })
  monto: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  centroCostoId?: number | null;
  
}


export class UpdateFinanzasDto {
  // --- 👇 MODIFICAR ESTE CAMPO ---
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true }) // Valida cada objeto {cuentaId, monto}
  @Type(() => CuentaMontoDto) // Le dice a class-transformer qué clase usar
  cuentas: CuentaMontoDto[]; // Antes: cuentas_presupuestarias_ids: number[]

  @IsInt()
  @Min(1)
  @IsOptional()
  fin_centro_costo_id?: number | null;
  
  @IsOptional()
  @IsString()
  fin_analisis?: string | null; // <-- Añadido para que coincida con el frontend

  @IsBoolean()
  @IsNotEmpty()
  esFraccionada: boolean;
  
}