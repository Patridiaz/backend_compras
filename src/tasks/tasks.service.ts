import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Connection } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';

@Injectable()
// 🚨 CLAVE: Implementar OnModuleInit para ejecutar código al inicio del servicio
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  // Inyectar la conexión por defecto de TypeORM
  constructor(@InjectConnection() private connection: Connection) {} 

  // =========================================================================
  // 1. EJECUCIÓN INMEDIATA AL INICIO (SETUP)
  // =========================================================================
  async onModuleInit() {

    await this.handleAreaRevisoraMaintenance(true);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAreaRevisoraMaintenance(isInitialRun: boolean = false) {
    if (!isInitialRun) {
    }

    // 🚨 IMPORTANTE: Se han eliminado las sentencias 'GO'
const maintenanceScript = `
        ----------------------------------------------------
        -- DDL (Data Definition Language) - Creación de la columna
        ----------------------------------------------------
        IF COL_LENGTH('dbo.[user]', 'area_revisora_id') IS NULL
        BEGIN
            EXEC('
                ALTER TABLE dbo.[user] ADD area_revisora_id INT NULL;
                
                -- Crear la clave foránea (incluida en el EXEC)
                IF NOT EXISTS (
                    SELECT * FROM sys.foreign_keys 
                    WHERE name = ''FK_User_AreaRevisora'' -- Doblar comillas para SQL dentro de string
                )
                BEGIN
                    ALTER TABLE dbo.[user]
                    ADD CONSTRAINT FK_User_AreaRevisora
                    FOREIGN KEY (area_revisora_id) REFERENCES dbo.areas_revisoras(id);
                END

                -- Crear el índice (incluido en el EXEC)
                IF NOT EXISTS (
                    SELECT * FROM sys.indexes 
                    WHERE name = ''IX_User_AreaRevisoraId'' -- Doblar comillas para SQL dentro de string
                )
                BEGIN
                    CREATE INDEX IX_User_AreaRevisoraId ON dbo.[user](area_revisora_id);
                END
            ');
            
        END

        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 2051)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 4 WHERE id = 2051;
        END

        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4066)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 4 WHERE id = 4066;
        END

        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 2059)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 4 WHERE id = 2059;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4087)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 5 WHERE id = 4087;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4097)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 1 WHERE id = 4097;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4098)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 1 WHERE id = 4098;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4092)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 1 WHERE id = 4092;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 5111)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 1 WHERE id = 5111;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4043)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 3 WHERE id = 4043;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 2116)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 3 WHERE id = 2116;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 5114)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 6 WHERE id = 5114;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 5115)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 6 WHERE id = 5115;
        END
        IF EXISTS (SELECT 1 FROM dbo.[user] WHERE id = 4078)
        BEGIN
            UPDATE dbo.[user] SET area_revisora_id = 6 WHERE id = 4078;
        END
    `;

    try {
      // 🚨 Ejecutar el script SQL crudo en un solo lote
      await this.connection.query(maintenanceScript);
      this.logger.log(`--- Tarea de Mantenimiento completada (${isInitialRun ? 'Inicial' : 'Cron'}). ---`);
    } catch (error) {
      // Si hay un error SQL, aparecerá en el log de NestJS
      this.logger.error('Error durante la tarea programada de mantenimiento:', error);
      this.logger.error('Script SQL que causó el error:', maintenanceScript.substring(0, 200) + '...');
    }
  }
}