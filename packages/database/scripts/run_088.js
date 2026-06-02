const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archon',
};

// Prima mensual de seguro por rango de arrendamiento mensual (MXN)
function getInsuranceCost(monthlyLease) {
  if (monthlyLease < 7000) return 850.0;
  if (monthlyLease < 9000) return 1150.0;
  if (monthlyLease < 12000) return 1450.0;
  return 1750.0;
}

// Genera todos los períodos YYYY-MM entre dos fechas inclusive
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
  console.log('[088] Iniciando hidratación de seguros...');
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    await conn.beginTransaction();

    // ── 1. Obtener unidades activas con su lease mensual ───────────────────────
    const [units] = await conn.execute(
      `SELECT id, monthlyLeasePayment FROM fleet_units
       WHERE status != 'Descontinuada' AND monthlyLeasePayment > 0`
    );

    console.log(`[088] ${units.length} unidades activas encontradas.`);

    // ── 2. Actualizar insuranceCost en fleet_units ─────────────────────────────
    for (const unit of units) {
      const cost = getInsuranceCost(Number(unit.monthlyLeasePayment));
      await conn.execute('UPDATE fleet_units SET insuranceCost = ? WHERE id = ?', [cost, unit.id]);
    }
    console.log('[088] ✅ insuranceCost actualizado en fleet_units.');

    // ── 3. Backfill INSURANCE en financial_transactions ────────────────────────
    const periods = generatePeriods('2023-12', '2026-05');
    const [adminRow] = await conn.execute('SELECT MIN(id) as id FROM users');
    const adminId = adminRow[0].id;

    let inserted = 0;
    for (const unit of units) {
      const monthlyCost = getInsuranceCost(Number(unit.monthlyLeasePayment));
      for (const period of periods) {
        const [exists] = await conn.execute(
          `SELECT 1 FROM financial_transactions
           WHERE unit_id = ? AND category = 'INSURANCE' AND period = ? AND source = 'AUTO'`,
          [unit.id, period]
        );
        if (exists.length === 0) {
          await conn.execute(
            `INSERT INTO financial_transactions
               (uuid, unit_id, category, amount, period, source, notes, created_by, created_at)
             VALUES (UUID(), ?, 'INSURANCE', ?, ?, 'AUTO', 'Prima de seguro mensual (backfill)', ?, STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))`,
            [unit.id, monthlyCost, period, adminId, period]
          );
          inserted++;
        }
      }
    }

    await conn.commit();
    console.log(`[088] ✅ ${inserted} registros INSURANCE insertados en financial_transactions.`);
    console.log(
      `[088] Períodos cubiertos: ${periods[0]} → ${periods[periods.length - 1]} (${
        periods.length
      } meses × ${units.length} unidades)`
    );
  } catch (err) {
    await conn.rollback();
    console.error('[088] ❌ Falló — rolled back.', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
