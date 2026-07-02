import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import FleetIntelligenceKpiService, {
  computeOee,
  computeTcoPerKm,
} from './fleetIntelligenceService';

import db from './db';

vi.mock('./db', () => ({ default: { execute: vi.fn().mockResolvedValue([[], undefined]) } }));

// ── FC-5 Fase 5B: Unit tests for pure KPI computation helpers ─────────────────

describe('computeOee', () => {
  it('returns correct OEE with all factors present', () => {
    // availability=90, performance=96/120=0.8, quality=0.9 → OEE=90/100*0.8*0.9*100=64.8
    expect(computeOee(90, 120, 0.9, 96)).toBeCloseTo(64.8, 1);
  });

  it('caps performance at 1.0 when actual daily km exceeds expected', () => {
    // dailyKmAvg=200 > dailyUsageAvg=100 → performance capped at 1.0
    // OEE = 1.0 * 1.0 * 1.0 * 100 = 100
    expect(computeOee(100, 100, 1.0, 200)).toBe(100);
  });

  it('returns null when quality_factor is null (no route history)', () => {
    expect(computeOee(100, 100, null, 80)).toBeNull();
  });

  it('returns null when dailyUsageAvg is 0 (no expected daily km configured)', () => {
    expect(computeOee(100, 0, 0.9, 80)).toBeNull();
  });

  it('returns null when dailyKmAvg is null (no completed routes)', () => {
    expect(computeOee(100, 100, 0.9, null)).toBeNull();
  });

  it('handles availabilityIndex of 0 correctly', () => {
    expect(computeOee(0, 100, 1.0, 100)).toBe(0);
  });

  it('returns value between 0 and 100 for typical fleet data', () => {
    const result = computeOee(92, 150, 0.95, 130);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(0);
    expect(result!).toBeLessThanOrEqual(100);
  });
});

describe('computeTcoPerKm', () => {
  it('computes correct cost per km', () => {
    expect(computeTcoPerKm(10000, 2500)).toBe(4);
  });

  it('rounds to 2 decimal places', () => {
    expect(computeTcoPerKm(1000, 3)).toBe(333.33);
  });

  it('returns null when totalKm is 0 (no km driven)', () => {
    expect(computeTcoPerKm(5000, 0)).toBeNull();
  });

  it('returns null when totalKm is negative', () => {
    expect(computeTcoPerKm(5000, -100)).toBeNull();
  });

  it('returns 0 when tcoTotal is 0', () => {
    expect(computeTcoPerKm(0, 1000)).toBe(0);
  });
});

// ─── FleetIntelligenceKpiService.compute() — branch coverage (lines 39-109) ──

describe('FleetIntelligenceKpiService.compute()', () => {
  beforeEach(() => vi.clearAllMocks());

  const unitRow = {
    ownerId: 1,
    availabilityIndex: 90,
    dailyUsageAvg: 120,
    maintIntervalDays: 180,
    maintIntervalKm: 10000,
  };

  it('FKPI-SVC-1: unit not found → returns null', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // empty unitRows
    const result = await FleetIntelligenceKpiService.compute('PIIC-999');
    expect(result).toBeNull();
  });

  it('FKPI-SVC-2: full data present → computes all KPIs', async () => {
    // 1 unit query + 5 Promise.all queries
    (db.execute as Mock)
      .mockResolvedValueOnce([[unitRow]]) // fleet_units
      .mockResolvedValueOnce([[{ quality_factor: 0.9, total_km: 5000, daily_km_avg: 96 }]]) // oeeRows
      .mockResolvedValueOnce([[{ tco_total: 20000 }]]) // tcoRows
      .mockResolvedValueOnce([[{ km_per_liter: 12.5 }]]) // fuelRows
      .mockResolvedValueOnce([[{ total: 10, compliant: 9 }]]) // pmRows
      .mockResolvedValueOnce([[{ avg_age_days: 15.3 }]]); // backlogRows
    const result = await FleetIntelligenceKpiService.compute('PIIC-101');
    expect(result).not.toBeNull();
    expect(result!.tco_per_km).toBe(4); // 20000 / 5000
    expect(result!.km_per_liter).toBe(12.5);
    expect(result!.pm_compliance).toBe(90); // 9/10 * 100
    expect(result!.backlog_aging_days).toBe(15.3);
    expect(result!.oee).not.toBeNull(); // computed from quality_factor, availabilityIndex, etc.
  });

  it('FKPI-SVC-3: all secondary rows empty → all KPIs null except ownerId', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[unitRow]]) // fleet_units
      .mockResolvedValueOnce([[]]) // oeeRows empty → oee=null, tcoPerKm=null
      .mockResolvedValueOnce([[]]) // tcoRows empty → tcoTotal=0
      .mockResolvedValueOnce([[]]) // fuelRows empty → kmPerLiter=null
      .mockResolvedValueOnce([[{ total: 0, compliant: 0 }]]) // pmRows → pmTotal=0 → null
      .mockResolvedValueOnce([[{ avg_age_days: null }]]); // backlogRows → null
    const result = await FleetIntelligenceKpiService.compute('PIIC-101');
    expect(result).not.toBeNull();
    expect(result!.oee).toBeNull();
    expect(result!.tco_per_km).toBeNull();
    expect(result!.km_per_liter).toBeNull();
    expect(result!.pm_compliance).toBeNull();
    expect(result!.backlog_aging_days).toBeNull();
  });

  it('FKPI-SVC-4: oeeRow present but quality_factor=null → oee=null; backlog_avg_age=0 → null', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[unitRow]])
      .mockResolvedValueOnce([[{ quality_factor: null, total_km: 3000, daily_km_avg: null }]])
      .mockResolvedValueOnce([[{ tco_total: 15000 }]])
      .mockResolvedValueOnce([[{ km_per_liter: null }]])
      .mockResolvedValueOnce([[{ total: 5, compliant: 4 }]])
      .mockResolvedValueOnce([[{ avg_age_days: 0 }]]); // 0 || null = null
    const result = await FleetIntelligenceKpiService.compute('PIIC-102');
    expect(result!.oee).toBeNull(); // qualityFactor=null → computeOee returns null
    expect(result!.tco_per_km).toBe(5); // 15000 / 3000
    expect(result!.km_per_liter).toBeNull(); // km_per_liter null
    expect(result!.pm_compliance).toBe(80); // 4/5 * 100
    expect(result!.backlog_aging_days).toBeNull(); // 0 || null = null
  });

  it('FKPI-SVC-5: unit con dailyUsageAvg/maintIntervalDays/maintIntervalKm null + km_per_liter=0 → cubre ?? y || null (B44/45/46/102)', async () => {
    const nullUnitRow = {
      ownerId: 1,
      availabilityIndex: 90,
      dailyUsageAvg: null, // ?? 0 right-side B44[0]
      maintIntervalDays: null, // ?? 180 right-side B45[0]
      maintIntervalKm: null, // ?? 10000 right-side B46[0]
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[nullUnitRow]])
      .mockResolvedValueOnce([[{ quality_factor: 0.9, total_km: 2000, daily_km_avg: 80 }]])
      .mockResolvedValueOnce([[{ tco_total: 10000 }]])
      .mockResolvedValueOnce([[{ km_per_liter: 0 }]]) // 0 != null → true → Number(0)||null → B102[0]
      .mockResolvedValueOnce([[{ total: 4, compliant: 4 }]])
      .mockResolvedValueOnce([[{ avg_age_days: 5 }]]);
    const result = await FleetIntelligenceKpiService.compute('PIIC-103');
    expect(result).not.toBeNull();
    expect(result!.oee).toBeNull(); // dailyUsageAvg=0 → computeOee returns null
    expect(result!.km_per_liter).toBeNull(); // Number(0)||null = null
    expect(result!.tco_per_km).toBe(5); // 10000/2000=5
    expect(result!.pm_compliance).toBe(100); // 4/4*100=100
    expect(result!.backlog_aging_days).toBe(5);
  });
});
