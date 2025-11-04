import { IsNumber } from 'class-validator';

export class AssignAreaDto {
  @IsNumber()
  area_asignado_id: number;
}
