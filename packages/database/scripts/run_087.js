const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function runMigration() {
  console.log('[087] Backfill: registrar combustible de rutas en financial_transactions');
  const pool = mysql.createPool(DB_CONFIG);
  const connection = await pool.getConnection();

  try {
    const sqlPath = path.join(__dirname, '../migrations/087_backfill_finance_from_routes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Strip comments and run the INSERT
    const cleanSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    console.log('[087] Ejecutando backfill idempotente...');
    const [result] = await connection.execute(cleanSql);
    const affected = result.affectedRows ?? 0;
    console.log(
      `[087] ✅ ${affected} registro(s) de combustible migrados a financial_transactions.`
    );

    if (affected === 0) {
      console.log(
        '[087] ℹ️  Sin nuevos registros (backfill ya ejecutado o no hay rutas con fuel_amount > 0).'
      );
    }
  } catch (err) {
    console.error('[087] ❌ Backfill fallido.', err);
    process.exit(1);
  } finally {
    connection.release();
    pool.end();
  }
}

runMigration();
