const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Dem.2024',
  server: '10.10.59.40',
  port: 1432,
  database: 'compras-demo', // BD de demo aislada
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function resetDemoData() {
  const pool = await sql.connect(config);
  try {
    console.log('Iniciando limpieza de datos transaccionales en [compras-demo]...');

    // Desactivar temporalmente restricciones de claves foráneas
    await pool.request().query(`
      EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";
    `);

    // Limpiar tablas transaccionales de compras
    await pool.request().query(`
      DELETE FROM dbo.solicitudes_firmas;
      DELETE FROM dbo.solicitud_anexos;
      DELETE FROM dbo.observaciones_area;
      DELETE FROM dbo.solicitudes_cuentas_presupuestarias;
      DELETE FROM dbo.solicitudes_compra;
      DELETE FROM dbo.file_entity;
    `);

    // Reiniciar los contadores de IDENTITY (para que el folio de compra empiece en 1)
    await pool.request().query(`
      DBCC CHECKIDENT ('dbo.solicitudes_compra', RESEED, 0);
    `);

    // Reactivar restricciones de claves foráneas
    await pool.request().query(`
      EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";
    `);

    const result = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.solicitudes_compra");
    console.log(`✅ Base de datos [compras-demo] limpia. Solicitudes de compra actuales: ${result.recordset[0].total}`);
    console.log('Los usuarios, roles, establecimientos y centros de costo se mantienen intactos.');

  } catch (error) {
    console.error('Error durante la limpieza:', error);
  } finally {
    await pool.close();
  }
}

resetDemoData();

