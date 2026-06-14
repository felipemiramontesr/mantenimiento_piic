const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigration() {
  console.log('[106] Conectando a BD...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  });

  const connection = await pool.getConnection();

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/106_clean_test_users.sql'),
      'utf8'
    );
    await connection.query(sql);
    console.log('[106] ✅ Limpieza completada.');

    const [users] = await connection.query('SELECT id, role_id FROM users ORDER BY id');
    console.log('[106] Usuarios restantes:', users);
  } catch (err) {
    console.error('[106] ❌ Falló.', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

runMigration();
