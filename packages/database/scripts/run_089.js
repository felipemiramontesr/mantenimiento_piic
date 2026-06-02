const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archon',
};

function generatePeriods(from, to) {
  const periods = [];
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  let y = fy,
    m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return periods;
}

async function run() {
  console.log('[089] Iniciando backfill de arrendamiento (LEASE)...');
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    await conn.beginTransaction();

    const [units] = await conn.execute(
      `SELECT id, monthlyLeasePayment FROM fleet_units
       WHERE status != 'Descontinuada' AND monthlyLeasePayment > 0`
    );

    const [adminRow] = await conn.execute('SELECT MIN(id) as id FROM users');
    const adminId = adminRow[0].id;

    const periods = generatePeriods('2023-12', '2026-05');
    let inserted = 0;

    for (const unit of units) {
      const amount = Number(unit.monthlyLeasePayment);
      for (const period of periods) {
        const [exists] = await conn.execute(
          `SELECT 1 FROM financial_transactions
           WHERE unit_id = ? AND category = 'LEASE' AND period = ? AND source = 'AUTO'`,
          [unit.id, period]
        );
        if (exists.length === 0) {
          await conn.execute(
            `INSERT INTO financial_transactions
               (uuid, unit_id, category, amount, period, source, notes, created_by, created_at)
             VALUES (UUID(), ?, 'LEASE', ?, ?, 'AUTO', 'Pago mensual de arrendamiento (backfill)', ?, STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))`,
            [unit.id, amount, period, adminId, period]
          );
          inserted++;
        }
      }
    }

    await conn.commit();
    console.log(`[089] ✅ ${inserted} registros LEASE insertados en financial_transactions.`);
    console.log(
      `[089] Períodos: ${periods[0]} → ${periods[periods.length - 1]} (${periods.length} meses × ${
        units.length
      } unidades)`
    );
  } catch (err) {
    await conn.rollback();
    console.error('[089] ❌ Falló — rolled back.', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
