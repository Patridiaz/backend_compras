const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Dem.2024',
  server: '10.10.59.40',
  port: 1432,
  database: 'master',
  requestTimeout: 180000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function cloneDatabase() {
  const pool = await sql.connect(config);
  try {
    console.log('1. Realizando backup fresco de [ticket-service]...');
    const backupPath = 'C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\Backup\\ticket-service_backup.bak';
    
    await pool.request().query(`
      BACKUP DATABASE [ticket-service] 
      TO DISK = '${backupPath}' 
      WITH FORMAT, INIT;
    `);
    console.log('Backup completado con exito.');

    console.log('2. Restaurando como [compras-demo]...');
    const mdfPath = 'C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\DATA\\compras_demo.mdf';
    const ldfPath = 'C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\DATA\\compras_demo_log.ldf';

    await pool.request().query(`
      IF DB_ID('compras-demo') IS NOT NULL
      BEGIN
        ALTER DATABASE [compras-demo] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [compras-demo];
      END;

      RESTORE DATABASE [compras-demo] 
      FROM DISK = '${backupPath}' 
      WITH 
        MOVE 'ticket-service' TO '${mdfPath}',
        MOVE 'ticket-service_log' TO '${ldfPath}',
        RECOVERY;
    `);
    console.log('Restauracion completada exitosamente.');

    // Verificar
    const res = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'compras-demo'");
    console.log('Base de datos lista:', res.recordset[0]?.name);

  } catch (err) {
    console.error('Error durante el proceso:', err);
  } finally {
    await pool.close();
  }
}

cloneDatabase();
