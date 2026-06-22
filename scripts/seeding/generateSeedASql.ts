/* eslint-disable no-console, no-bitwise, no-underscore-dangle, no-restricted-syntax */
/**
 * Genera packages/database/migrations/125_seeding_A_movements.sql
 * para aplicar FaseA en producción (phpMyAdmin).
 * Ejecutar: node node_modules/tsx/dist/cli.mjs scripts/seeding/generateSeedASql.ts
 */
import fs from 'fs';
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
const OUT = path.resolve(
  __dirname,
  '../../packages/database/migrations/125_seeding_A_movements.sql'
);

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDt(d: Date, hour: number): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy} ${String(hour).padStart(2, '0')}:00:00`;
}

// Deterministic UUID v4 from seed — formato: 8-4-4-4-12 (36 chars)
function deterministicUuid(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const a = h;
  const b = Math.imul(a ^ 0xdeadbeef, 0x9e3779b9) >>> 0;
  const c = Math.imul(b ^ 0xfeedface, 0x6b43a9b5) >>> 0;
  const d = Math.imul(c ^ 0x12345678, 0x2f6b3a1d) >>> 0;
  const e = Math.imul(d ^ 0xabcdef01, 0x4a7d9c23) >>> 0;

  const ha = a.toString(16).padStart(8, '0');
  const hb = b.toString(16).padStart(8, '0');
  const hc = c.toString(16).padStart(8, '0');
  const hd = d.toString(16).padStart(8, '0');
  const he = e.toString(16).padStart(8, '0');

  const seg1 = ha; // 8 chars
  const seg2 = hb.slice(0, 4); // 4 chars
  const seg3 = `4${hb.slice(4, 7)}`; // 4 chars (version 4)
  const seg4 = `${(8 | (parseInt(hc[0], 16) & 3)).toString(16)}${hc.slice(1, 4)}`; // 4 chars (variant)
  const seg5 = `${hc.slice(4, 8)}${hd.slice(0, 4)}${he.slice(0, 4)}`; // 12 chars

  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
}

const ALL_UNITS = [
  {
    id: 'PIIC-101',
    schedule: PIIC101_SCHEDULE,
    baseOdo: 45320 - PIIC101_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-201',
    schedule: PIIC201_SCHEDULE,
    baseOdo: 67890 - PIIC201_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-202',
    schedule: PIIC202_SCHEDULE,
    baseOdo: 89150 - PIIC202_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-301',
    schedule: PIIC301_SCHEDULE,
    baseOdo: 28400 - PIIC301_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-302',
    schedule: PIIC302_SCHEDULE,
    baseOdo: 112650 - PIIC302_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-303',
    schedule: PIIC303_SCHEDULE,
    baseOdo: 54780 - PIIC303_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-304',
    schedule: PIIC304_SCHEDULE,
    baseOdo: 45000 - PIIC304_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
  {
    id: 'PIIC-305',
    schedule: PIIC305_SCHEDULE,
    baseOdo: 35000 - PIIC305_SCHEDULE.reduce((s, r) => s + r.km, 0),
  },
];

function generateSql(): string {
  const BASE = new Date('2025-06-03');
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- Migration 125 — Seeding A: fleet_movements (FaseA DataResilience)');
  lines.push(
    `-- FC: DataResilience_NHTSAIntegration · Generado: ${new Date().toISOString().slice(0, 10)}`
  );
  lines.push('-- Idempotente: INSERT IGNORE en uuid único (uq_fm_uuid)');
  lines.push('-- Aplicar en: phpMyAdmin u701509674_Mant_piic');
  lines.push('-- ============================================================');
  lines.push('');

  // PIIC-304 y PIIC-305
  lines.push('-- ── PIIC-304 y PIIC-305 (unidades FaseF VIM Intelligence) ──');
  lines.push(`INSERT IGNORE INTO fleet_units`);
  lines.push(`  (id, uuid, ownerId, assetTypeId, brandId, modelId, year, fuelTypeId,`);
  lines.push(`   transmisionId, odometer, lastServiceDate, lastServiceReading,`);
  lines.push(`   maintIntervalKm, maintIntervalDays, status)`);
  lines.push(`VALUES`);
  lines.push(
    `  ('PIIC-304','aaaa0001-0000-4000-8000-000000000304',${SEED_A_OWNER_ID},1,23,525,2020,10,31,45000,'2026-03-01',35000,10000,180,'Disponible'),`
  );
  lines.push(
    `  ('PIIC-305','aaaa0001-0000-4000-8000-000000000305',${SEED_A_OWNER_ID},1,23,525,2020,10,31,35000,'2026-02-01',25000,10000,180,'Disponible');`
  );
  lines.push('');

  // Movements + extensions + checkpoints
  for (const { id, schedule, baseOdo } of ALL_UNITS) {
    lines.push(`-- ── ${id} (${schedule.length} rutas) ──`);
    let odo = baseOdo;

    for (let i = 0; i < schedule.length; i += 1) {
      const { days, km, liters, driverId } = schedule[i];
      const date = addDays(BASE, days);
      const startOdo = odo;
      odo += km;
      const endOdo = odo;
      const fuelAmt = Math.round(liters * 22.5 * 100) / 100;
      const uuid = deterministicUuid(`${id}-${i}-${days}`);
      const startAt = fmtDt(date, 8);
      const endAt = fmtDt(date, 17);

      lines.push(
        `INSERT IGNORE INTO fleet_movements (uuid, unit_id, movement_type, status, start_reading, end_reading, fuel_liters_loaded, fuel_amount, start_at, end_at, description) VALUES ('${uuid}','${id}','ROUTE','COMPLETED',${startOdo},${endOdo},${liters},${fuelAmt},'${startAt}','${endAt}','${SEED_A_TAG}');`
      );
      lines.push(
        `INSERT IGNORE INTO fleet_route_extensions (movement_id, driver_id, destination) SELECT id, ${driverId}, 'Zona Industrial Norte' FROM fleet_movements WHERE uuid = '${uuid}';`
      );

      // Checkpoints para PIIC-302 ruta 30
      if (id === 'PIIC-302' && i === 30) {
        lines.push(
          `INSERT IGNORE INTO fleet_route_checkpoints (movement_id, sequence, name, status) SELECT id, 1, 'Punto de control A', 'VISITED' FROM fleet_movements WHERE uuid = '${uuid}';`
        );
        lines.push(
          `INSERT IGNORE INTO fleet_route_checkpoints (movement_id, sequence, name, status) SELECT id, 2, 'Punto de control B', 'SKIPPED' FROM fleet_movements WHERE uuid = '${uuid}';`
        );
        lines.push(
          `INSERT IGNORE INTO fleet_route_checkpoints (movement_id, sequence, name, status) SELECT id, 3, 'Punto de control C', 'VISITED' FROM fleet_movements WHERE uuid = '${uuid}';`
        );
        lines.push(
          `INSERT IGNORE INTO fleet_route_checkpoints (movement_id, sequence, name, status) SELECT id, 4, 'Destino final', 'VISITED' FROM fleet_movements WHERE uuid = '${uuid}';`
        );
      }
    }
    lines.push('');
  }

  lines.push('-- ── Verificación post-aplicación ──');
  lines.push(
    `SELECT unit_id, COUNT(*) AS rutas FROM fleet_movements WHERE description = '${SEED_A_TAG}' GROUP BY unit_id ORDER BY unit_id;`
  );
  lines.push(
    `SELECT COUNT(*) AS checkpoints FROM fleet_route_checkpoints cp JOIN fleet_movements m ON m.id = cp.movement_id WHERE m.description = '${SEED_A_TAG}';`
  );

  return lines.join('\n');
}

const sql = generateSql();
fs.writeFileSync(OUT, sql, 'utf8');
console.log(`✅ Generado: ${OUT}`);
console.log(`   Líneas: ${sql.split('\n').length}`);
