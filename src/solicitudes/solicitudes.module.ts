import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Establecimiento } from 'src/establecimientos/entities/establecimiento.entity';
import { AreaRevisora } from 'src/areas/entities/area.entity';
import { Prioridad } from 'src/prioridades/entities/prioridad.entity';
import { EstadoSolicitud } from 'src/estados/entities/estado-solicitud.entity';
import { Fondo } from 'src/fondos/entities/fondo.entity';
import { Modalidad } from 'src/modalidades/entities/modalidad.entity';
import { Pme } from 'src/pme/entities/pme.entity';
import { CuentaPresupuestaria } from 'src/cuentas/entities/cuenta-presupuestaria.entity';
import { ObservacionArea } from 'src/observaciones/entities/observacion-area.entity';
import { CentroCosto } from 'src/centro-costo/entities/centro-costo.entity';

@Module({
  imports: [
    // ✅ CORRECCIÓN: Todas las entidades ahora se registran juntas en la única conexión por defecto.
    TypeOrmModule.forFeature([
      SolicitudCompra,
      Establecimiento,
      AreaRevisora,
      Prioridad,
      EstadoSolicitud,
      Fondo,
      Modalidad,
      Pme,
      CuentaPresupuestaria,
      ObservacionArea,
      Usuario, 
      CentroCosto
    ]),

  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}