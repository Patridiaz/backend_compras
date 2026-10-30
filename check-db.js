const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Dem.2024',
  server: '10.10.59.40',
  port: 1432,
  database: 'master',
  options: { encrypt: false, trustServerCertificate: true },
};

async function check() {
  const pool = await sql.connect(config);
  try {
    const dbs = await pool.request().query("SELECT name FROM sys.databases");
    console.log('DATABASES:', dbs.recordset.map(r => r.name));

    const files = await pool.request().query("SELECT name, physical_name, DB_NAME(database_id) as db FROM sys.master_files WHERE DB_NAME(database_id) LIKE '%demo%' OR physical_name LIKE '%demo%'");
    console.log('DEMO FILES:', files.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.close();
  }
}

check();

