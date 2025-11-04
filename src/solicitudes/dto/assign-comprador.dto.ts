// src/solicitudes/dto/assign-comprador.dto.ts
import { IsNumber } from 'class-validator';

export class AssignCompradorDto {
  @IsNumber()
  comprador_asignado_id: number; // usuario comprador que toma la solicitud
}
