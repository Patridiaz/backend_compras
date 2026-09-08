import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pme } from './entities/pme.entity';

@Injectable()
export class PmeService {
  constructor(
    @InjectRepository(Pme) // Inyecta el repositorio
    private readonly pmeRepo: Repository<Pme>,
  ) {}

  /**
   * Encuentra todos los PME asociados a un establecimiento y año específico.
   */
  async findByEstablecimiento(establecimientoId: number, anio?: number): Promise<Pme[]> {
    if (!establecimientoId) {
      return [];
    }

    const year = anio || new Date().getFullYear();
    const queryBuilder = this.pmeRepo.createQueryBuilder('pme')
      .where('pme.establecimiento_id = :id', { id: establecimientoId })
      .andWhere('pme.periodo = :periodo', { periodo: year })
      .orderBy('pme.dimension', 'ASC')
      .addOrderBy('pme.descripcionAccion', 'ASC');

    return queryBuilder.getMany();
  }

  async duplicarAnio(origen: number, destino: number) {
    if (!origen || !destino) {
      throw new BadRequestException('Los parámetros origen y destino son obligatorios.');
    }
    if (origen === destino) {
      throw new BadRequestException('El año de origen y destino no pueden ser iguales.');
    }

    const pmesOrigen = await this.pmeRepo.find({
      where: { periodo: origen },
      relations: ['establecimiento'],
    });

    if (pmesOrigen.length === 0) {
      throw new NotFoundException(`No se encontraron PMEs para el año origen ${origen}.`);
    }

    const pmesDestino = await this.pmeRepo.find({
      where: { periodo: destino },
      relations: ['establecimiento'],
    });

    // Clave única para evitar duplicados por establecimiento, dimensión y acción
    const getKey = (p: Pme) =>
      `${p.establecimiento?.id ?? 'NULL'}_${p.dimension?.trim().toLowerCase()}_${p.descripcionAccion?.trim().toLowerCase()}`;

    const existentesKeys = new Set(pmesDestino.map(getKey));
    const aCrear = pmesOrigen.filter(p => !existentesKeys.has(getKey(p)));

    if (aCrear.length === 0) {
      return {
        mensaje: `Todos los PMEs del año ${origen} ya existen en el año ${destino}.`,
        clonados: 0,
        omitidos: pmesOrigen.length,
        pmes: [],
      };
    }

    const nuevosPmes = aCrear.map(p => {
      return this.pmeRepo.create({
        dimension: p.dimension,
        descripcionAccion: p.descripcionAccion,
        periodo: destino,
        establecimiento: p.establecimiento,
      });
    });

    const guardados = await this.pmeRepo.save(nuevosPmes);

    return {
      mensaje: `Se duplicaron ${guardados.length} PMEs del periodo ${origen} al ${destino} exitosamente.`,
      clonados: guardados.length,
      omitidos: pmesOrigen.length - guardados.length,
      pmes: guardados,
    };
  }

  async fixDb() {
    try {
      // 1. Agregar la columna periodo si no existe
      await this.pmeRepo.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('pme') AND name = 'periodo')
        BEGIN
            ALTER TABLE pme ADD periodo INT NOT NULL DEFAULT 2026;
        END
      `);

      // 2. Verificar si la columna id tiene IDENTITY
      const identityCheck = await this.pmeRepo.query(`
        SELECT COLUMNPROPERTY(OBJECT_ID('pme'), 'id', 'IsIdentity') AS IsIdentity
      `);

      if (identityCheck[0]?.IsIdentity === 0) {
        // La columna id NO tiene IDENTITY, necesitamos recrearla
        return { 
          ok: false, 
          needsManualFix: true,
          message: 'La tabla PME necesita que la columna id tenga IDENTITY. Por favor ejecuta este SQL manualmente en SSMS:',
          sql: `
-- Paso 1: Crear tabla temporal con la estructura correcta
CREATE TABLE pme_temp (
    id INT IDENTITY(1,1) PRIMARY KEY,
    dimension NVARCHAR(MAX) NOT NULL,
    descripcionAccion NVARCHAR(MAX) NOT NULL,
    periodo INT NOT NULL DEFAULT 2026,
    establecimiento_id INT NULL
);

-- Paso 2: Copiar datos existentes
SET IDENTITY_INSERT pme_temp ON;
INSERT INTO pme_temp (id, dimension, descripcionAccion, periodo, establecimiento_id)
SELECT id, dimension, descripcionAccion, ISNULL(periodo, 2026), establecimiento_id
FROM pme;
SET IDENTITY_INSERT pme_temp OFF;

-- Paso 3: Eliminar tabla original y renombrar
DROP TABLE pme;
EXEC sp_rename 'pme_temp', 'pme';

-- Paso 4: Recrear foreign keys si existen
-- ALTER TABLE pme ADD CONSTRAINT FK_pme_establecimiento 
--   FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id);
          `
        };
      }

      return { ok: true, message: 'Tabla PME actualizada correctamente con columna periodo.' };
    } catch (e) {
      return { ok: false, message: 'Error actualizando tabla PME', error: e.message };
    }
  }

  // Método para obtener todos los PME (con filtro opcional por periodo)
  async findAll(anio?: number): Promise<Pme[]> {
    const where: any = {};
    if (anio) {
      where.periodo = anio;
    }
    return this.pmeRepo.find({
      where,
      relations: ['establecimiento'],
      order: { id: 'ASC' },
    });
  }
}