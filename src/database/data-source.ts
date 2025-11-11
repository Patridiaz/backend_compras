import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path'; // 👈 Importa 'join' de path

config(); // Carga .env

export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  
  // ✅ SOLUCIÓN 1: Añade el bloque 'options'
  options: {
    encrypt: false, // <-- La línea que faltaba
    trustServerCertificate: true,
  },
  

  // ✅ SOLUCIÓN 3: Corrige las rutas para que TypeORM encuentre tus entidades
  entities: [
    join(__dirname, '..', '**', '*.entity{.ts,.js}'),
  ],

  // ✅ SOLUCIÓN 4: Corrige la ruta de migraciones
  migrations: [
    join(__dirname, 'migrations', '*{.ts,.js}'),
  ],
});