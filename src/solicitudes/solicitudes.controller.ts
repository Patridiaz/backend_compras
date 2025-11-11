import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AssignFinanzasDto } from './dto/assign-finanzas.dto';
import { UpdateFinanzasDto } from './dto/update-finanzas.dto';
import { AssignCompradorDto } from './dto/assign-comprador.dto';
import { UpdateCompradorDto } from './dto/update-comprador.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AssignAreaDto } from './dto/assign-area.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';
import { DevolverSolicitudDto } from './dto/devolver-solicitud.dto';
import { Usuario } from 'src/usuarios/usuario.entity';

@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  // --- Colección
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cotizacion', maxCount: 1 },
        { name: 'terminos_de_referencia', maxCount: 1 },
        { name: 'bt', maxCount: 1 },
        { name: 'req_compra_agil', maxCount: 1 },
        { name: 'nominas', maxCount: 1 },
        { name: 'espec_productos', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
      },
    ),
  )
  create(@UploadedFiles() files: any, @Body() dto: CreateSolicitudDto, @Req() req) {
    console.log('--- 📥 [POST] /solicitudes ---');
    console.log('Usuario del token:', req.user);
    console.log('Datos del DTO:', dto);
    // ✅ Asigna el ID del usuario del token como el creador de la solicitud.
    dto.nombre_solicitante_id = req.user.sub;
    return this.service.create(dto, files);
  }

  
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // --- FINANZAS (siempre ANTES de :id)
  @Get('finanzas/queue')
  findFinanzasQueue() {
    return this.service.findForFinanzasQueue();
  }

  @Get('finanzas/mias/:userId')
  findFinanzasMine(@Param('userId') userId: string) {
    return this.service.findForFinanzasUser(Number(userId));
  }

  @Post(':id/finanzas/assign')
  assign(@Param('id') id: string, @Body() dto: AssignFinanzasDto) {
    return this.service.assignToFinanzas(Number(id), dto);
  }

  @Patch(':id/finanzas')
  updateFin(@Param('id') id: string, @Body() dto: UpdateFinanzasDto) {
    return this.service.updateFinanzas(Number(id), dto);
  }

  // --- COMPRAS (siempre ANTES de :id)
  @Get('compras/queue')
  findCompradorQueue() {
    return this.service.findForCompradorQueue();
  }

  @Get('compras/mias/:userId')
  findCompradorMine(@Param('userId') userId: string) {
    return this.service.findForCompradorUser(Number(userId));
  }

  @Post(':id/compras/assign')
  assignComprador(@Param('id') id: string, @Body() dto: AssignCompradorDto) {
    return this.service.assignToComprador(Number(id), dto);
  }

  @Patch(':id/compras')
  updateComprador(@Param('id') id: string, @Body() dto: UpdateCompradorDto) {
    return this.service.updateComprador(Number(id), dto);
  }

  @Post(':id/enviar-revision')
  enviarRevision(
    @Param('id') id: string,
    @Request() req, // Para obtener el usuario del token
  ) {
    return this.service.enviarParaRevision(Number(id), req.user);
  }

  // --- ÁREAS REVISORAS (siempre ANTES de :id) ---
  @Get('areas/:areaId/queue')
  findAreaRevisoraQueue(@Param('areaId') areaId: string) {
    return this.service.findForAreaRevisoraQueue(Number(areaId));
  }

  @Post(':id/areas/assign')
  assignAreaRevisora(@Param('id') id: string, @Body() dto: AssignAreaDto) {
    return this.service.assignToAreaRevisora(Number(id), dto);
  }

  // --- AÑADE ESTE NUEVO ENDPOINT ---
  @Get('areas/mias/:userId')
  findAreaRevisoraMine(@Param('userId') userId: string) {
    return this.service.findForAreaRevisoraUser(Number(userId));
  }

  // --- NUEVO ENDPOINT PARA REVISAR/DERIVAR ---
  @Post(':id/revisar')
  revisar(
    @Param('id') id: string,
    @Body() dto: RevisarSolicitudDto,
    @Request() req, // Para obtener el usuario del token
  ) {
    // req.user es el payload del token que añade JwtAuthGuard
    return this.service.revisarSolicitud(Number(id), dto, req.user);
  }

  // --- JEFATURA DEM (siempre ANTES de :id) ---
  @Get('jefadem/queue')
  findJefaDemQueue() {
    return this.service.findForJefaDemQueue();
  }

  @Post(':id/jefadem/aprobar')
  aprobarJefaDem(@Param('id') id: string, @Request() req) {
    // Mueve de Pendiente Jefa DEM (10) a Finalizada (9)
    return this.service.aprobarJefaDem(Number(id), req.user);
  }

  @Post(':id/jefadem/rechazar')
  rechazarJefaDem(
    @Param('id') id: string,
    @Body() dto: RevisarSolicitudDto,
    @Request() req,
  ) {
    // Mueve de Pendiente Jefa DEM (10) a Rechazada (5)
    return this.service.rechazarJefaDem(Number(id), dto, req.user);
  }

  // --- Recurso individual (al final)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

@Patch(':id')
@UseInterceptors( // 👈 ¡AGREGAR ESTE BLOQUE!
    FileFieldsInterceptor(
        [
            { name: 'cotizacion', maxCount: 1 },
            { name: 'terminos_de_referencia', maxCount: 1 },
            { name: 'bt', maxCount: 1 },
            { name: 'req_compra_agil', maxCount: 1 },
            { name: 'nominas', maxCount: 1 },
            { name: 'espec_productos', maxCount: 1 },
        ],
        {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    return cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
        },
    ),
) // 👈 FIN DEL INTERCEPTOR
update(
    @Param('id') id: string, 
    @UploadedFiles() files: any, 
    @Body() dto: UpdateSolicitudDto,
    @Request() req 
) {

    return this.service.update(+id, dto, req.user as Usuario, files); 
    // 💡 Asegúrate de que el método `update` en el servicio acepta `files`
}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  // --- NUEVO ENDPOINT PARA DEVOLVER AL SOLICITANTE ---
  @Post(':id/devolver')
    // ✅ Usar Guards y Roles aquí para restringir a COMPRAS, FINANZAS, JEFA DEM
    devolverSolicitud(
      @Param('id') id: string,
      @Body() dto: DevolverSolicitudDto, // Usa el nuevo DTO
      @Request() req, // Para obtener el usuario del token
    ) {
      console.log('--- ↩️ [POST] /solicitudes/:id/devolver ---');
      // Casteamos req.user (payload del token) a Usuario
      return this.service.devolverAlSolicitante(Number(id), dto, req.user as Usuario);
    }
}
