/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax, no-underscore-dangle */
/**
 * Seeding B — financial_transactions + route_incidents
 * FC: DataResilience_NHTSAIntegration · FaseB
 *
 * Idempotente: notas='SEED_B' en financial_transactions
 *             + description LIKE '[SEED_B]%' en route_incidents.
 * Ejecutar: node node_modules/tsx/dist/cli.mjs scripts/seeding/seedBMovements.ts
 */
import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SEED_B_TAG,
  ALL_UNIT_B_SEEDING,
  type FinancialEntry,
  type IncidentSpec,
} from '../../apps/api/src/scripts/seeding/seedBData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function insertTransactions(
  db: mysql.Connection,
  unitId: string,
  transactions: FinancialEntry[],
  createdBy: number
): Promise<void> {
  for (const t of transactions) {
    await db.execute<ResultSetHeader>(
      `INSERT INTO financial_transactions
        (uuid, unit_id, category, amount, period, source, vendor, notes, created_by)
       VALUES (UUID(), ?, ?, ?, ?, 'MANUAL', ?, ?, ?)`,
      [unitId, t.category, t.amount, t.period, t.vendor ?? null, t.notes, createdBy]
    );
  }
  console.log(`  ✓ ${unitId} — ${transactions.length} transacciones insertadas`);
}

async function insertIncidents(
  db: mysql.Connection,
  unitId: string,
  incidents: IncidentSpec[]
): Promise<void> {
  if (incidents.length === 0) return;

  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT uuid FROM fleet_movements
      WHERE unit_id = ? AND description = 'SEED_A'
      ORDER BY start_at ASC`,
    [unitId]
  );

  const uuids: string[] = rows.map((r) => String(r.uuid));

  for (const inc of incidents) {
    const routeUuid = uuids[inc.routeIndex];
    if (routeUuid) {
      await db.execute(
        `INSERT INTO route_incidents
          (route_uuid, category, description, severity, status)
         VALUES (?, ?, ?, ?, 'OPEN')`,
        [routeUuid, inc.category, inc.description, inc.severity]
      );
    } else {
      console.warn(`  ⚠ ${unitId}: no movement at routeIndex=${inc.routeIndex}, saltando.`);
    }
  }
  console.log(`  ✓ ${unitId} — ${incidents.length} incidents insertados`);
}

async function seedB(conn?: mysql.Connection): Promise<void> {
  const db =
    conn ??
    (await mysql.createConnection({
      host: process.env.DB_HOST ?? 'localhost',
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'archon',
      multipleStatements: false,
    }));

  const [existingFt] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM financial_transactions WHERE notes = ?`,
    [SEED_B_TAG]
  );
  if (Number(existingFt[0].cnt) > 0) {
    console.log(`✓ Seeding B ya aplicado (${existingFt[0].cnt} transacciones). Omitiendo.`);
    if (!conn) await db.end();
    return;
  }

  const [userRows] = await db.execute<RowDataPacket[]>(
    `SELECT id FROM users ORDER BY id ASC LIMIT 1`
  );
  if (userRows.length === 0) throw new Error('No users found in DB — cannot set created_by');
  const createdBy = Number(userRows[0].id);
  console.log(`▶ created_by = ${createdBy}`);

  console.log('\n▶ Insertando financial_transactions...');
  for (const unit of ALL_UNIT_B_SEEDING) {
    await insertTransactions(db, unit.unitId, unit.transactions, createdBy);
  }

  console.log('\n▶ Insertando route_incidents...');
  for (const unit of ALL_UNIT_B_SEEDING) {
    await insertIncidents(db, unit.unitId, unit.incidents);
  }

  console.log('');
  console.log('✅ Seeding B completado.');
  console.log('   PIIC-101 → EC-3: 5 incidents julio 2025 (índices 4-8)');
  console.log('   PIIC-201 → EC-2: $95,000 REPAIR motor completo');
  console.log('   PIIC-202 → EC-2: 0 incidents — quality_factor=1.0');
  console.log('   PIIC-301 → EC-2: 48 incidents ALL routes — quality_factor=0.00');
  console.log('   PIIC-301 → EC-3: TCO=67,000 — score=0.744 → EVALUATE');
  console.log('   PIIC-302 → EC-2: TCO=205,000 → REPLACE (TCO máximo)');
  console.log('   PIIC-303 → EC-2: 3 warranty $0 · EC-3: TCO=117,000 → REPLACE');
  console.log('   PIIC-304/305 → TCO=83,000 · FaseF confidence_score activado');

  if (!conn) await db.end();
}

export default seedB;

const isMain = process.argv[1]?.includes('seedBMovements');
if (isMain) {
  seedB().catch((e: Error) => {
    console.error('Error en Seeding B:', e.message);
    process.exit(1);
  });
}
