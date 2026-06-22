/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax, no-underscore-dangle */
/**
 * Seeding A — fleet_movements + fleet_route_extensions + fleet_route_checkpoints
 * FC: DataResilience_NHTSAIntegration · FaseA
 *
 * Idempotente: SEED_TAG en description + INSERT IGNORE en uuid único.
 * Ejecutar: node node_modules/tsx/dist/cli.mjs scripts/seeding/seedAMovements.ts
 */
import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SEED_A_TAG,
  SEED_A_OWNER_ID,
  PIIC101_SCHEDULE,
  PIIC201_SCHEDULE,
  PIIC202_SCHEDULE,
  PIIC301_SCHEDULE,
  PIIC302_SCHEDULE,
  PIIC303_SCHEDULE,
  PIIC304_SCHEDULE,
  PIIC305_SCHEDULE,
} from '../../apps/api/src/scripts/seeding/seedAData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function routeStart(d: Date): string {
  const r = new Date(d);
  r.setHours(8, 0, 0, 0);
  return fmtDate(r);
}

function routeEnd(d: Date): string {
  const r = new Date(d);
  r.setHours(17, 0, 0, 0);
  return fmtDate(r);
}

interface RouteRecord {
  uuid: string;
  unitId: string;
  date: Date;
  startReading: number;
  endReading: number;
  liters: number;
  fuelAmount: number;
  driverId: number;
}

function buildRoutes(
  unitId: string,
  baseOdo: number,
  schedule: { days: number; km: number; liters: number; driverId: number }[]
): RouteRecord[] {
  const base = new Date('2025-06-03');
  let odo = baseOdo;
  return schedule.map(({ days, km, liters, driverId }): RouteRecord => {
    const date = addDays(base, days);
    const start = odo;
    odo += km;
    return {
      uuid: crypto.randomUUID(),
      unitId,
      date,
      startReading: start,
      endReading: odo,
      liters,
      fuelAmount: Math.round(liters * 22.5 * 100) / 100,
      driverId,
    };
  });
}

const totalKm = (s: typeof PIIC101_SCHEDULE): number => s.reduce((acc, r) => acc + r.km, 0);

const ALL_UNITS = [
  { id: 'PIIC-101', schedule: PIIC101_SCHEDULE, baseOdo: 45320 - totalKm(PIIC101_SCHEDULE) },
  { id: 'PIIC-201', schedule: PIIC201_SCHEDULE, baseOdo: 67890 - totalKm(PIIC201_SCHEDULE) },
  { id: 'PIIC-202', schedule: PIIC202_SCHEDULE, baseOdo: 89150 - totalKm(PIIC202_SCHEDULE) },
  { id: 'PIIC-301', schedule: PIIC301_SCHEDULE, baseOdo: 28400 - totalKm(PIIC301_SCHEDULE) },
  { id: 'PIIC-302', schedule: PIIC302_SCHEDULE, baseOdo: 112650 - totalKm(PIIC302_SCHEDULE) },
  { id: 'PIIC-303', schedule: PIIC303_SCHEDULE, baseOdo: 54780 - totalKm(PIIC303_SCHEDULE) },
  { id: 'PIIC-304', schedule: PIIC304_SCHEDULE, baseOdo: 45000 - totalKm(PIIC304_SCHEDULE) },
  { id: 'PIIC-305', schedule: PIIC305_SCHEDULE, baseOdo: 35000 - totalKm(PIIC305_SCHEDULE) },
];

async function insertCheckpoints(db: mysql.Connection, movementId: number): Promise<void> {
  const cps = [
    { seq: 1, name: 'Punto de control A', status: 'VISITED' },
    { seq: 2, name: 'Punto de control B', status: 'SKIPPED' },
    { seq: 3, name: 'Punto de control C', status: 'VISITED' },
    { seq: 4, name: 'Destino final', status: 'VISITED' },
  ];
  for (const cp of cps) {
    await db.execute(
      'INSERT IGNORE INTO fleet_route_checkpoints (movement_id, sequence, name, status) VALUES (?,?,?,?)',
      [movementId, cp.seq, cp.name, cp.status]
    );
  }
  console.log(`  ↳ EC-3 PIIC-302: checkpoints insertados (seq 2 = SKIPPED)`);
}

async function seedA(conn?: mysql.Connection): Promise<void> {
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
    'SELECT COUNT(*) AS cnt FROM fleet_movements WHERE description = ?',
    [SEED_A_TAG]
  );
  if (Number(existing[0].cnt) > 0) {
    console.log(`✓ Seeding A ya aplicado (${existing[0].cnt} movements). Omitiendo.`);
    if (!conn) await db.end();
    return;
  }

  console.log('▶ Insertando PIIC-304 y PIIC-305 (unidades FaseF)...');
  await db.execute(
    `INSERT IGNORE INTO fleet_units
      (id, uuid, ownerId, assetTypeId, brandId, modelId, year, fuelTypeId,
       transmisionId, odometer, lastServiceDate, lastServiceReading,
       maintIntervalKm, maintIntervalDays, status)
     VALUES
      ('PIIC-304','aaaa0001-0000-4000-8000-000000000304',?,1,23,525,2020,10,31,45000,'2026-03-01',35000,10000,180,'Disponible'),
      ('PIIC-305','aaaa0001-0000-4000-8000-000000000305',?,1,23,525,2020,10,31,35000,'2026-02-01',25000,10000,180,'Disponible')`,
    [SEED_A_OWNER_ID, SEED_A_OWNER_ID]
  );

  let checkpointMovementId: number | null = null;

  for (const { id, schedule, baseOdo } of ALL_UNITS) {
    console.log(`▶ Insertando rutas para ${id} (${schedule.length} rutas)...`);
    const routes = buildRoutes(id, baseOdo, schedule);

    for (let i = 0; i < routes.length; i += 1) {
      const r = routes[i];
      const [res] = await db.execute<ResultSetHeader>(
        `INSERT IGNORE INTO fleet_movements
          (uuid, unit_id, movement_type, status,
           start_reading, end_reading,
           fuel_liters_loaded, fuel_amount,
           start_at, end_at, description)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          r.uuid,
          r.unitId,
          'ROUTE',
          'COMPLETED',
          r.startReading,
          r.endReading,
          r.liters,
          r.fuelAmount,
          routeStart(r.date),
          routeEnd(r.date),
          SEED_A_TAG,
        ]
      );

      const movementId = res.insertId;
      if (movementId !== 0) {
        await db.execute(
          'INSERT IGNORE INTO fleet_route_extensions (movement_id, driver_id, destination) VALUES (?,?,?)',
          [movementId, r.driverId, 'Zona Industrial Norte']
        );

        if (id === 'PIIC-302' && i === 30) {
          checkpointMovementId = movementId;
          await insertCheckpoints(db, movementId);
        }
      }
    }
    console.log(`  ✓ ${id} — ${schedule.length} rutas · odo base ${baseOdo}`);
  }

  console.log('');
  console.log('✅ Seeding A completado.');
  console.log(`   PIIC-101 → EC-1 fuel theft (ruta idx=58: 200km/250L)`);
  console.log(`   PIIC-201 → EC-3 blackout Jan15-Mar1 · EC-1 4 drivers`);
  console.log(`   PIIC-202 → EC-3 CO₂ spike (ruta idx=53: 500km/200L)`);
  console.log(`   PIIC-301 → EC-1 dormant (última ruta ≈ Mar 17 2026)`);
  console.log(
    `   PIIC-302 → EC-1 star performer 14.29km/L · EC-3 seq 2 SKIPPED (movement ${checkpointMovementId})`
  );
  console.log(`   PIIC-303/304/305 → normales · FaseF confidence_score activado`);

  if (!conn) await db.end();
}

export default seedA;

const isMain = process.argv[1]?.includes('seedAMovements');
if (isMain) {
  seedA().catch((e: Error) => {
    console.error('Error en Seeding A:', e.message);
    process.exit(1);
  });
}
