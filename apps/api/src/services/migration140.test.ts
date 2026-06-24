/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FleetIntelligenceEngine } from './fleetIntelligence';
import db from './db';

vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

const SQL_PATH = join(
  __dirname,
  '../../../../packages/database/migrations/140_piic304_complete_hydration.sql'
);
const sql = readFileSync(SQL_PATH, 'utf-8');

describe('Migration 140 — AT-DH-B: FC-7 FaseB (Structural + Behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Structural: SQL file content assertions ────────────────────────────────

  it('AT-DH-B-1: contiene 2 movimientos MAINTENANCE para PIIC-304', () => {
    expect(sql).toContain('fc07-maint-0001-0000-000000000001');
    expect(sql).toContain('fc07-maint-0002-0000-000000000002');
    expect(sql).toContain("'PIIC-304','MAINTENANCE','COMPLETED'");
  });

  it('AT-DH-B-2: contiene INSERT IGNORE en fleet_maintenance_extensions', () => {
    expect(sql).toContain('INSERT IGNORE INTO fleet_maintenance_extensions');
    // idempotente: usa subquery SELECT FROM fleet_movements WHERE uuid
    expect(sql).toContain('FROM fleet_movements');
    expect(sql).toContain("WHERE uuid = 'fc07-maint-0001");
  });

  it('AT-DH-B-4: contiene UPDATE de ownerId para PIIC-304 y PIIC-305', () => {
    expect(sql).toContain('ownerId');
    expect(sql).toContain("WHERE id IN ('PIIC-304','PIIC-305')");
    expect(sql).toContain('SELECT id FROM owners ORDER BY id LIMIT 1');
  });

  it('AT-DH-B-5: contiene 13 financial_transactions (6 FUEL + 5 MAINT + 2 INS)', () => {
    const fuelCount = (sql.match(/fc07-fuel-000\d/g) ?? []).length;
    const mntCount = (sql.match(/fc07-mnt-0000\d/g) ?? []).length;
    const insCount = (sql.match(/fc07-ins-0000\d/g) ?? []).length;
    expect(fuelCount).toBe(6);
    expect(mntCount).toBe(5);
    expect(insCount).toBe(2);
  });

  it('AT-DH-B-6: contiene 4 rutas SEED_ANOMALY con fuel ≥ 70L', () => {
    expect(sql).toContain('fc07-anom-0001-0000-000000000001');
    expect(sql).toContain('fc07-anom-0002-0000-000000000002');
    expect(sql).toContain('fc07-anom-0003-0000-000000000003');
    expect(sql).toContain('fc07-anom-0004-0000-000000000004');
    expect(sql).toContain("'SEED_ANOMALY'");
    // verificar que los valores de fuel son ≥ 70 (75, 78, 72, 76)
    expect(sql).toContain('75.00');
    expect(sql).toContain('78.00');
    expect(sql).toContain('72.00');
    expect(sql).toContain('76.00');
  });

  it('AT-DH-B-7: contiene UPDATE driver_id=304 → usuario válido vía subquery', () => {
    expect(sql).toContain('fre.driver_id = 304');
    expect(sql).toContain('SELECT id FROM users ORDER BY id LIMIT 1');
  });

  it('AT-DH-B-8: contiene UPDATE terrainTypeId = 269 (All-Terrain A/T)', () => {
    expect(sql).toContain('terrainTypeId = 269');
    expect(sql).toContain("WHERE id IN ('PIIC-304','PIIC-305')");
  });

  it('AT-DH-B-9: contiene ALTER TABLE ADD COLUMN acquisitionCost', () => {
    expect(sql).toContain('ALTER TABLE fleet_units');
    expect(sql).toContain('acquisitionCost');
    expect(sql).toContain('IF NOT EXISTS');
  });

  it('AT-DH-B-10: contiene acquisitionCost = 650000.00', () => {
    expect(sql).toContain('acquisitionCost = 650000.00');
  });

  // ── Behavioral: computeKpis con 2 movimientos MAINTENANCE ─────────────────

  it('AT-DH-B-3: computeKpis con 2 MAINTENANCE movements → mtbfHours > 0 y mttrHours > 0', async () => {
    // Simular 2 MAINTENANCE COMPLETED movements: 6h y 6.5h MTTR
    // MTTR medio = (6+6.5)/2 = 6.25h
    // Período: 2026-01-10 a 2026-04-15 = ~95 días = ~2280h operativas
    // MTBF = (2280 - 12.5) / 2 ≈ 1133h
    (db.execute as any)
      .mockResolvedValueOnce([[{ unit_id: 'PIIC-304', mttr_hours: 6.25 }]])
      .mockResolvedValueOnce([[{ unit_id: 'PIIC-304', mtbf_hours: 1133.75 }]])
      .mockResolvedValueOnce([[]]); // oee/fuel query

    const kpiMap = await FleetIntelligenceEngine.computeKpis(['PIIC-304']);
    const kpi = kpiMap.get('PIIC-304');

    expect(kpi).toBeDefined();
    expect(kpi!.mttrHours).toBeGreaterThan(0);
    expect(kpi!.mtbfHours).toBeGreaterThan(0);
    expect(kpi!.availabilityIndex).toBeGreaterThan(0);
    expect(kpi!.availabilityIndex).toBeLessThanOrEqual(100);
  });
});
