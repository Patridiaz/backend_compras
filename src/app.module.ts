import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// --- Módulos de tu aplicación ---
import { UsuariosModule } from './usuarios/usuarios.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AuthModule } from './auth/auth.module';
import { EstablecimientosModule } from './establecimientos/establecimientos.module';
import { AreasModule } from './areas/areas.module';
import { PrioridadesModule } from './prioridades/prioridades.module';
import { FondosModule } from './fondos/fondos.module';
import { ModalidadesModule } from './modalidades/modalidades.module';
import { PmeModule } from './pme/pme.module';
import { EstadosModule } from './estados/estados.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { CentroCostoModule } from './centro-costo/centro-costo.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),


    TypeOrmModule.forRootAsync({
      // ❌ Se elimina 'name: 'ticketsConnection'' porque ahora es la conexión por defecto.
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        console.log('--- 🚀 Conectando a la base de datos principal ---');
        console.log(`HOST: ${cfg.get<string>('DB_HOST')}, DB: ${cfg.get<string>('DB_NAME')}`);
        
        return {
          type: 'mssql',
          // ✅ Asegúrate de que tu .env ahora use estas variables para apuntar a 'ticket-service'
          host: cfg.get<string>('DB_HOST'),
          port: parseInt(cfg.get<string>('DB_PORT') || '1432', 10),
          username: cfg.get<string>('DB_USER'),
          password: cfg.get<string>('DB_PASS'),
          database: cfg.get<string>('DB_NAME'),
          
          autoLoadEntities: true,
          synchronize: false,
          logging: true,
          options: {
            encrypt: false,
            trustServerCertificate: true,
          },
        };
      },
    }),


    // --- Módulos de la Aplicación ---
    AuthModule,
    UsuariosModule,
    SolicitudesModule,
    EstablecimientosModule,
    AreasModule,
    PrioridadesModule,
    FondosModule,
    ModalidadesModule,
    PmeModule,
    EstadosModule,
    CuentasModule,
    CentroCostoModule,
    TasksModule
  ],
})
export class AppModule {}