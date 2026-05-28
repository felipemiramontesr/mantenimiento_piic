/* eslint-disable */
/**
 * Seed: Historical Maintenance Events
 * Generates realistic backdated maintenance records per fleet unit
 * to enable MTBF / MTTR / Availability / Backlog KPI calculation.
 *
 * Run: npx ts-node -e "require('./src/scripts/seedMaintenanceHistory')"
 * from apps/api — dev only, never production.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

// ── Config ────────────────────────────────────────────────────────────────────
const MINE_EVENTS = 5; // ~15 months at 90d interval
const AGENCY_EVENTS = 4; // ~24 months at 180d interval
const KM_VARIANCE = 200; // ± km per event
const DAY_VARIANCE = 3; // ± days per event
const FORCE = process.argv.includes('--force');

// Realistic downtime ranges for a mining/industrial fleet (in hours):
//   Parts sourcing, technician scheduling and post-service inspection
//   push actual workshop time to 3–15 days, not just hours.
const MTTR_HOURS: Record<string, [number, number]> = {
  MINOR_MINING: [72, 120], //  3–5  days  (in-situ, simpler scope)
  BASIC_10K: [72, 168], //  3–7  days
  INTERMEDIATE_20K: [120, 240], //  5–10 days
  MAJOR_30K: [168, 288], //  7–12 days
  ADVANCED_50K: [240, 360], // 10–15 days
};

const COST_MXN: Record<string, [number, number]> = {
  MINOR_MINING: [1_800, 3_500],
  BASIC_10K: [2_500, 4_500],
  INTERMEDIATE_20K: [3_500, 6_000],
  MAJOR_30K: [5_500, 9_000],
  ADVANCED_50K: [7_000, 12_000],
};

// Agency cascade cycle (oldest → newest within a 60K cycle)
const AGENCY_CYCLE = [
  'BASIC_10K',
  'INTERMEDIATE_20K',
  'MAJOR_30K',
  'ADVANCED_50K',
  'MAJOR_30K',
  'INTERMEDIATE_20K',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

const randF = (min: number, max: number) =>
  Math.round((min + Math.random() * (max - min)) * 100) / 100;

const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const toDatetime = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19);

const toDate = (d: Date) => d.toISOString().substring(0, 10);

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔱 Archon Seed: Maintenance History\n');

  // Fetch active units
  const [units] = await db.execute<RowDataPacket[]>(`
    SELECT id, maintIntervalKm, maintIntervalDays, odometer, lastServiceReading, fuelTypeId
    FROM fleet_units
    WHERE status != 'Descontinuada'
    ORDER BY id
  `);

  // Fetch technicians
  const [techRows] = await db.execute<RowDataPacket[]>(`
    SELECT full_name, username FROM users
    WHERE is_active = 1
    ORDER BY RAND()
    LIMIT 8
  `);
  const technicians: string[] = techRows
    .map((r) => (r.full_name || r.username) as string)
    .filter(Boolean);
  if (technicians.length === 0) technicians.push('Staff Técnico');

  // Fetch plan tasks per service type (base tasks, no cascade needed for seed)
  const [taskRows] = await db.execute<RowDataPacket[]>(`
    SELECT service_type, task_code FROM maintenance_plan_tasks ORDER BY service_type, task_code
  `);
  const tasksByType: Record<string, string[]> = {};
  for (const r of taskRows) {
    if (!tasksByType[r.service_type]) tasksByType[r.service_type] = [];
    tasksByType[r.service_type].push(r.task_code as string);
  }

  const today = new Date();
  today.setHours(8, 0, 0, 0);

  let totalEvents = 0;
  let skipped = 0;

  for (const unit of units) {
    const unitId = unit.id as string;
    const intervalKm = Number(unit.maintIntervalKm) || 10_000;
    const intervalDays = Number(unit.maintIntervalDays) || 180;
    const currentOdometer = Number(unit.odometer) || 0;
    const isMine = intervalKm === 5_000 || intervalDays === 90;

    // In --force mode, purge existing COMPLETED maintenance records first
    if (FORCE) {
      await db.execute(
        `DELETE FROM fleet_movements WHERE unit_id = ? AND movement_type = 'MAINTENANCE' AND status = 'COMPLETED'`,
        [unitId]
      );
    }

    // Skip units that already have maintenance history (normal mode)
    const [[{ cnt }]] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM fleet_movements WHERE unit_id = ? AND movement_type = 'MAINTENANCE'`,
      [unitId]
    );
    if (Number(cnt) > 0) {
      console.log(`  ⤷ ${unitId}: ya tiene historial — omitido`);
      skipped++;
      continue;
    }

    const numEvents = isMine ? MINE_EVENTS : AGENCY_EVENTS;
    let lastServiceDate: string | null = null;
    let lastServiceOdometer = 0;

    // Insert events oldest → newest (i = numEvents..1)
    for (let i = numEvents; i >= 1; i--) {
      const daysBack = i * intervalDays + rand(-DAY_VARIANCE, DAY_VARIANCE);
      const startAt = new Date(today);
      startAt.setDate(today.getDate() - daysBack);
      startAt.setHours(7 + rand(0, 2), rand(0, 59), 0, 0);

      const serviceType = isMine
        ? 'MINOR_MINING'
        : AGENCY_CYCLE[(numEvents - i) % AGENCY_CYCLE.length];

      const [minH, maxH] = MTTR_HOURS[serviceType] ?? [6, 10];
      const durationH = randF(minH, maxH);
      const endAt = addHours(startAt, durationH);

      const odometerAt = Math.max(
        0,
        currentOdometer - i * intervalKm + rand(-KM_VARIANCE, KM_VARIANCE)
      );
      const [minC, maxC] = COST_MXN[serviceType] ?? [3_000, 6_000];
      const cost = randF(minC, maxC);
      const technician = technicians[rand(0, technicians.length - 1)];
      const serviceMode = serviceType === 'MINOR_MINING' ? 'IN_SITU' : 'WORKSHOP';
      const uuid = randomUUID();
      const isLastEvent = i === 1;

      let connection;
      try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // fleet_movements
        const [movResult] = (await connection.execute(
          `INSERT INTO fleet_movements
             (uuid, unit_id, movement_type, status,
              start_reading, end_reading, start_at, end_at, created_at, updated_at)
           VALUES (?, ?, 'MAINTENANCE', 'COMPLETED', ?, ?, ?, ?, ?, ?)`,
          [
            uuid,
            unitId,
            odometerAt,
            odometerAt,
            toDatetime(startAt),
            toDatetime(endAt),
            toDatetime(startAt),
            toDatetime(endAt),
          ]
        )) as RowDataPacket[];

        const movementId = (movResult as unknown as { insertId: number }).insertId;

        // fleet_maintenance_extensions
        await connection.execute(
          `INSERT INTO fleet_maintenance_extensions
             (movement_id, service_date, service_type, service_mode, system_recommended_type, cost, technician)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [movementId, toDate(startAt), serviceType, serviceMode, serviceType, cost, technician]
        );

        // fleet_maintenance_details — task checklist
        const tasks = tasksByType[serviceType] ?? [];
        for (let ti = 0; ti < tasks.length; ti++) {
          const roll = Math.random();
          let statusCode = 'PASS';

          if (isLastEvent && ti < 2 && roll < 0.35) {
            statusCode = 'DEFERRED'; // carry-forward for BCK metric
          } else if (!isLastEvent && roll < 0.15) {
            statusCode = 'REPLACED';
          } else if (roll < 0.05) {
            statusCode = 'FAIL';
          }

          await connection.execute(
            `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status_code, notes)
             VALUES (?, ?, ?, NULL)`,
            [movementId, tasks[ti], statusCode]
          );
        }

        await connection.commit();
        totalEvents++;

        if (isLastEvent) {
          lastServiceDate = toDate(startAt);
          lastServiceOdometer = odometerAt;
        }
      } catch (err) {
        if (connection) await connection.rollback();
        console.error(`  ✗ ${unitId} evento ${numEvents - i + 1}:`, (err as Error).message);
      } finally {
        if (connection) connection.release();
      }
    }

    // Update unit's last service snapshot
    if (lastServiceDate) {
      await db.execute(
        `UPDATE fleet_units SET lastServiceDate = ?, lastServiceReading = ? WHERE id = ?`,
        [lastServiceDate, lastServiceOdometer, unitId]
      );
    }

    console.log(`  ✓ ${unitId} — ${numEvents} eventos (${isMine ? 'mina' : 'agencia'})`);
  }

  console.log(
    `\n✅ Seed completo — ${totalEvents} eventos insertados, ${skipped} unidades omitidas`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Seed fallido:', err);
  process.exit(1);
});
