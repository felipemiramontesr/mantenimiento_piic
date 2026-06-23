/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax, no-underscore-dangle */
/**
 * Seeding C — catalog_recalls + fleet_unit_recalls + compliance UPDATE
 * FC: DataResilience_NHTSAIntegration · FaseC
 *
 * Idempotente: INSERT IGNORE en catalog_recalls (uk_campaign_code)
 *             + INSERT IGNORE en fleet_unit_recalls (PK composite)
 * Ejecutar: node node_modules/tsx/dist/cli.mjs scripts/seeding/seedCRecalls.ts
 */
import mysql, { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SEED_C_TAG,
  RECALL_CATALOG,
  UNIT_RECALL_ASSIGNMENTS,
  PIIC202_COMPLIANCE,
} from '../../apps/api/src/scripts/seeding/seedCData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedC(conn?: mysql.Connection): Promise<void> {
  const db =
    conn ??
    (await mysql.createConnection({
      host: process.env.DB_HOST ?? 'localhost',
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'archon',
      multipleStatements: false,
    }));

  const [existing] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM catalog_recalls WHERE campaign_code LIKE ?`,
    [`${SEED_C_TAG}%`]
  );
  if (Number(existing[0].cnt) > 0) {
    console.log(`✓ Seeding C ya aplicado (${existing[0].cnt} campañas). Omitiendo.`);
    if (!conn) await db.end();
    return;
  }

  console.log('\n▶ Insertando catalog_recalls...');
  for (const r of RECALL_CATALOG) {
    await db.execute(
      `INSERT IGNORE INTO catalog_recalls
        (campaign_code, description, make, model, year, published_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [r.campaignCode, r.description, r.make, r.model, r.year, r.publishedDate]
    );
    console.log(`  ✓ ${r.campaignCode} (${r.make} ${r.model} ${r.year})`);
  }

  console.log('\n▶ Insertando fleet_unit_recalls...');
  for (const a of UNIT_RECALL_ASSIGNMENTS) {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT id FROM catalog_recalls WHERE campaign_code = ?`,
      [a.campaignCode]
    );
    if (rows.length === 0) {
      console.warn(`  ⚠ campaign_code ${a.campaignCode} no encontrado, saltando.`);
    } else {
      const recallId = Number(rows[0].id);
      await db.execute(
        `INSERT IGNORE INTO fleet_unit_recalls
          (fleet_unit_id, recall_id, status, resolved_at)
         VALUES (?, ?, ?, ?)`,
        [a.unitId, recallId, a.status, a.resolvedAt ?? null]
      );
      console.log(`  ✓ ${a.unitId} ← ${a.campaignCode} [${a.status}]`);
    }
  }

  console.log('\n▶ Actualizando compliance PIIC-202 (EC-1 perfect compliance)...');
  await db.execute(
    `UPDATE fleet_units SET
      insuranceExpiryDate      = ?,
      vencimientoVerificacion  = ?,
      insurance_policy_number  = ?
     WHERE id = ?`,
    [
      PIIC202_COMPLIANCE.insuranceExpiryDate,
      PIIC202_COMPLIANCE.vencimientoVerificacion,
      PIIC202_COMPLIANCE.insurancePolicyNumber,
      PIIC202_COMPLIANCE.unitId,
    ]
  );
  console.log(
    `  ✓ PIIC-202 insurance=${PIIC202_COMPLIANCE.insuranceExpiryDate} verificacion=${PIIC202_COMPLIANCE.vencimientoVerificacion}`
  );

  console.log('');
  console.log('✅ Seeding C completado.');
  console.log('   PIIC-101 → EC-2: 3 recalls PENDING (NP300-2021-A/B/C)');
  console.log('   PIIC-202 → EC-1: 1 PENDING + 1 COMPLETED · compliance 2027');
  console.log('   PIIC-303 → EC-1: 1 recall PENDING (overlap inyector + MAINTENANCE)');
  console.log('   PIIC-202 → compliance dates → 2027 (outlier positivo)');

  if (!conn) await db.end();
}

export default seedC;

const isMain = process.argv[1]?.includes('seedCRecalls');
if (isMain) {
  seedC().catch((e: Error) => {
    console.error('Error en Seeding C:', e.message);
    process.exit(1);
  });
}
