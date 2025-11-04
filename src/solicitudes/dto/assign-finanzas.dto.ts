import { IsNumber } from 'class-validator';
export class AssignFinanzasDto {
  @IsNumber()
  fin_asignado_id: number; // usuario de finanzas que toma la solicitud
}
