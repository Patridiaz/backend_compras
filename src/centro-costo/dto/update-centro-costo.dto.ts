import { PartialType } from '@nestjs/mapped-types';
import { CreateCentroCostoDto } from '../dto/create-centro-costo.dto';

export class UpdateCentroCostoDto extends PartialType(CreateCentroCostoDto) {}