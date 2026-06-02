/**
 * run_090_periodic_finance.js
 *
 * Inserta registros LEASE + INSURANCE en financial_transactions para cada
 * unidad activa en el rango de períodos especificado.
 *
 * Variables de entorno:
 *   FINANCE_FROM  — período inicial YYYY-MM (default: mes actual UTC)
 *   FINANCE_TO    — período final   YYYY-MM (default: igual a FINANCE_FROM)
 *
 * Idempotente: si el registro ya existe para (unit_id, category, period, source='AUTO')
 * lo omite sin error. Seguro para ejecutar N veces.
 *
 * Uso:
 *   node run_090_periodic_finance.js
 *   FINANCE_FROM=2026-04 FINANCE_TO=2026-06 node run_090_periodic_finance.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archon',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentPeriod() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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

// Prima mensual de seguro por rango de arrendamiento (MXN) — sincronizado con run_088.js
function getInsuranceCost(monthlyLease) {
  if (monthlyLease < 7000) return 850.0;
  if (monthlyLease < 9000) return 1150.0;
  if (monthlyLease < 12000) return 1450.0;
  return 1750.0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const today = currentPeriod();
  const from = process.env.FINANCE_FROM || today;
  const to = process.env.FINANCE_TO || from;

  // Validate YYYY-MM format
  const periodRx = /^\d{4}-\d{2}$/;
  if (!periodRx.test(from) || !periodRx.test(to)) {
    console.error('[090] ❌ FINANCE_FROM y FINANCE_TO deben tener formato YYYY-MM.');
    process.exit(1);
  }
  if (from > to) {
    console.error(`[090] ❌ FINANCE_FROM (${from}) debe ser <= FINANCE_TO (${to}).`);
    process.exit(1);
  }

  const periods = generatePeriods(from, to);
  console.log(
    `[090] Períodos a procesar: ${from} → ${to} (${periods.length} mes${
      periods.length !== 1 ? 'es' : ''
    })`
  );

  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    await conn.beginTransaction();

    const [units] = await conn.execute(
      `SELECT id, monthlyLeasePayment
       FROM fleet_units
       WHERE status != 'Descontinuada' AND monthlyLeasePayment > 0`
    );

    if (units.length === 0) {
      console.log('[090] ⚠️  No hay unidades activas con arrendamiento configurado.');
      await conn.rollback();
      return;
    }

    const [adminRow] = await conn.execute('SELECT MIN(id) AS id FROM users');
    const adminId = adminRow[0].id;

    let insertedLease = 0;
    let insertedInsurance = 0;
    let skipped = 0;

    for (const unit of units) {
      const leaseAmount = Number(unit.monthlyLeasePayment);
      const insuranceAmount = getInsuranceCost(leaseAmount);

      for (const period of periods) {
        // ── LEASE ──────────────────────────────────────────────────────────────
        const [leaseExists] = await conn.execute(
          `SELECT 1 FROM financial_transactions
           WHERE unit_id = ? AND category = 'LEASE' AND period = ? AND source = 'AUTO'`,
          [unit.id, period]
        );
        if (leaseExists.length === 0) {
          await conn.execute(
            `INSERT INTO financial_transactions
               (uuid, unit_id, category, amount, period, source, notes, created_by, created_at)
             VALUES (UUID(), ?, 'LEASE', ?, ?, 'AUTO', 'Pago mensual de arrendamiento (auto)', ?,
                     STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))`,
            [unit.id, leaseAmount, period, adminId, period]
          );
          insertedLease++;
        } else {
          skipped++;
        }

        // ── INSURANCE ──────────────────────────────────────────────────────────
        const [insuranceExists] = await conn.execute(
          `SELECT 1 FROM financial_transactions
           WHERE unit_id = ? AND category = 'INSURANCE' AND period = ? AND source = 'AUTO'`,
          [unit.id, period]
        );
        if (insuranceExists.length === 0) {
          await conn.execute(
            `INSERT INTO financial_transactions
               (uuid, unit_id, category, amount, period, source, notes, created_by, created_at)
             VALUES (UUID(), ?, 'INSURANCE', ?, ?, 'AUTO', 'Prima de seguro mensual (auto)', ?,
                     STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))`,
            [unit.id, insuranceAmount, period, adminId, period]
          );
          insertedInsurance++;
        } else {
          skipped++;
        }
      }
    }

    await conn.commit();

    const totalInserted = insertedLease + insertedInsurance;
    console.log(
      `[090] ✅ ${totalInserted} registros insertados (LEASE: ${insertedLease}, INSURANCE: ${insertedInsurance})`
    );
    if (skipped > 0) {
      console.log(`[090]    ${skipped} registros omitidos (ya existían — idempotencia OK)`);
    }
    console.log(`[090]    Unidades procesadas: ${units.length} | Períodos: ${periods.length}`);
  } catch (err) {
    await conn.rollback();
    console.error('[090] ❌ Error — rollback ejecutado.', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
