// Pega esto en tu nuevo archivo: src/database/migrations/17...-AddAreaToUser.ts

import { MigrationInterface, QueryRunner } from "typeorm";

// El nombre de la clase (AddAreaToUser17...) debe coincidir con el nombre del archivo
export class AddAreaToUser1762261535730 implements MigrationInterface { 
    name = 'AddAreaToUser1762261535730' // Puedes ajustar esto al nombre real

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- INICIO: Este es tu SQL ---
        await queryRunner.query(`
            ALTER TABLE dbo.[user]
            ADD area_revisora_id INT NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE dbo.[user]
            ADD CONSTRAINT FK_User_AreaRevisora
            FOREIGN KEY (area_revisora_id) REFERENCES dbo.areas_revisoras(id)
        `);
        
        await queryRunner.query(`
            CREATE INDEX IX_User_AreaRevisoraId ON dbo.[user](area_revisora_id)
        `);
        // --- FIN: Este es tu SQL ---
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Esto revierte los cambios si ejecutas "migration:revert"
        await queryRunner.query(`DROP INDEX IX_User_AreaRevisoraId ON dbo.[user]`);
        await queryRunner.query(`ALTER TABLE dbo.[user] DROP CONSTRAINT FK_User_AreaRevisora`);
        await queryRunner.query(`ALTER TABLE dbo.[user] DROP COLUMN area_revisora_id`);
    }
}