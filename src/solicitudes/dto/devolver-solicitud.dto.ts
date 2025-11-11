import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DevolverSolicitudDto {
  @IsNotEmpty({ message: 'La observación es requerida para devolver la solicitud.' })
  @IsString({ message: 'La observación debe ser una cadena de texto.' })
  @MinLength(5, { message: 'La observación debe tener al menos 5 caracteres para la devolución.' })
  observacion: string;
}