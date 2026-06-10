const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('[096] Conectando a BD...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    console.log('[096] Cargando SQL...');
    const sqlPath = path.join(__dirname, '../migrations/096_push_notifications_tokens.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[096] Iniciando transacción...');
    await connection.beginTransaction();

    console.log('[096] Ejecutando migración...');
    const queries = sql
      .split(';')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    for (const query of queries) {
      console.log(`[096] Ejecutando query...`);
      await connection.execute(query);
    }

    await connection.commit();
    console.log('[096] ✅ Migración aplicada exitosamente.');
  } catch (err) {
    await connection.rollback();
    console.error('[096] ❌ Falló — rollback ejecutado.', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigration();
