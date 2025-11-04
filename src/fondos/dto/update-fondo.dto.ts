import { PartialType } from '@nestjs/mapped-types';
import { CreateFondoDto } from './create-fondo.dto';
export class UpdateFondoDto extends PartialType(CreateFondoDto) {}
