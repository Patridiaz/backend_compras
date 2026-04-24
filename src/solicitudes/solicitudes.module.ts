import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudCompra } from './entities/solicitud-compra.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { AreaRevisora } from '../areas/entities/area.entity';
import { Prioridad } from '../prioridades/entities/prioridad.entity';
import { EstadoSolicitud } from '../estados/entities/estado-solicitud.entity';
import { Fondo } from '../fondos/entities/fondo.entity';
import { Modalidad } from '../modalidades/entities/modalidad.entity';
import { Pme } from '../pme/entities/pme.entity';
import { CuentaPresupuestaria } from '../cuentas/entities/cuenta-presupuestaria.entity';
import { ObservacionArea } from '../observaciones/entities/observacion-area.entity';
import { CentroCosto } from '../centro-costo/entities/centro-costo.entity';
import { SolicitudCuentaPresupuestaria } from './entities/SolicitudCuentaPresupuestaria.entity';
import { SolicitudesPdfService } from './solicitudes-pdf.service';
import { EmailService } from '../auth/nodemailer/email.service';
import { Anexo } from '../anexos/entities/anexo.entity';
import { MercadoPublicoModule } from '../mercado-publico/mercado-publico.module';

@Module({
  imports: [
    // ✅ CORRECCIÓN: Todas las entidades ahora se registran juntas en la única conexión por defecto.
    TypeOrmModule.forFeature([
      Anexo,
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
      CentroCosto,
      SolicitudCuentaPresupuestaria,
    ]),
    MercadoPublicoModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, SolicitudesPdfService, EmailService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}