import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AnomalyDetectionService, {
  computeZScore,
  computeDeviationPct,
  MOVING_AVG_DEVIATION_THRESHOLD,
  Z_SCORE_THRESHOLD,
  FLEET_SIZE_THRESHOLD,
} from './anomalyDetectionService';
import db from './db';

vi.mock('./db', () => ({
  default: { execute: vi.fn().mockResolvedValue([[], undefined]) },
}));

describe('computeZScore', () => {
  it('AD-PURE-1: valor en la media → z-score 0', () => {
    expect(computeZScore(10, 10, 2)).toBe(0);
  });

  it('AD-PURE-2: valor 1σ por arriba → z-score 1.0', () => {
    expect(computeZScore(12, 10, 2)).toBe(1.0);
  });

  it('AD-PURE-3: valor 1σ por abajo → z-score -1.0', () => {
    expect(computeZScore(8, 10, 2)).toBe(-1.0);
  });

  it('AD-PURE-4: stdDev = 0 → null (evita división por cero)', () => {
    expect(computeZScore(10, 10, 0)).toBeNull();
  });

  it('AD-PURE-5: z-score > 1.5 → debe clasificarse como anomalía', () => {
    const z = computeZScore(14, 10, 2);
    expect(z).not.toBeNull();
    expect(Math.abs(z!)).toBeGreaterThan(Z_SCORE_THRESHOLD);
  });

  it('AD-PURE-6: z-score < 1.5 → no anomalía', () => {
    const z = computeZScore(11.5, 10, 2);
    expect(z).not.toBeNull();
    expect(Math.abs(z!)).toBeLessThanOrEqual(Z_SCORE_THRESHOLD);
  });
});

describe('computeDeviationPct', () => {
  it('AD-PURE-7: sin desviación → 0%', () => {
    expect(computeDeviationPct(10, 10)).toBe(0);
  });

  it('AD-PURE-8: caída del 25% → -25%', () => {
    expect(computeDeviationPct(7.5, 10)).toBe(-25);
  });

  it('AD-PURE-9: mejora del 20% → +20%', () => {
    expect(computeDeviationPct(12, 10)).toBe(20);
  });

  it('AD-PURE-10: baseline = 0 → null (evita división por cero)', () => {
    expect(computeDeviationPct(10, 0)).toBeNull();
  });

  it('AD-PURE-11: caída >20% → supera umbral de anomalía', () => {
    const deviation = computeDeviationPct(7, 10);
    expect(deviation).not.toBeNull();
    expect(Math.abs(deviation!) / 100).toBeGreaterThan(MOVING_AVG_DEVIATION_THRESHOLD);
  });

  it('AD-PURE-12: caída exactamente 20% → en el límite del umbral', () => {
    const deviation = computeDeviationPct(8, 10);
    expect(deviation).toBe(-20);
    expect(Math.abs(deviation!) / 100).toBe(MOVING_AVG_DEVIATION_THRESHOLD);
  });
});

// ─── AnomalyDetectionService.compute() — integración con DB ──────────────────
// Cubre: arithmeticMean · populationStdDev · resolveMovingAvg · resolveZScore · compute()
// Secuencia de mocks db.execute: (1) unitRows · (2) countRows · (3) baselineRows · (4) recentRows/fleetRows

describe('AnomalyDetectionService.compute()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`AD-SVC-1: unit not found → null`, async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // unitRows empty
    const result = await AnomalyDetectionService.compute('unit-X');
    expect(result).toBeNull();
  });

  it(`AD-SVC-2: fleet_size < ${FLEET_SIZE_THRESHOLD} → moving_avg, anomalía detectada`, async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]]) // unitRows
      .mockResolvedValueOnce([[{ fleet_size: 3 }]]) // countRows (<10 → moving_avg)
      .mockResolvedValueOnce([[{ km_per_liter: 10.5 }]]) // baselineRows
      .mockResolvedValueOnce([[{ recent_km_per_liter: 8.0 }]]); // recentRows — caída >20%
    const result = await AnomalyDetectionService.compute('unit-1');
    expect(result).not.toBeNull();
    expect(result!.algorithm).toBe('moving_avg');
    expect(result!.ownerId).toBe(5);
    expect(result!.fleet_size).toBe(3);
    expect(result!.is_anomaly).toBe(true);
    expect(result!.deviation_pct).toBeCloseTo(-23.81, 1);
    expect(result!.z_score).toBeNull();
  });

  it('AD-SVC-3: fleet pequeña, sin datos recientes → moving_avg, is_anomaly=false', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ fleet_size: 3 }]])
      .mockResolvedValueOnce([[{ km_per_liter: 10.5 }]])
      .mockResolvedValueOnce([[{ recent_km_per_liter: null }]]); // null → no deviation
    const result = await AnomalyDetectionService.compute('unit-2');
    expect(result!.algorithm).toBe('moving_avg');
    expect(result!.is_anomaly).toBe(false);
    expect(result!.deviation_pct).toBeNull();
    expect(result!.unit_km_per_liter).toBeNull();
  });

  it(`AD-SVC-4: fleet_size >= ${FLEET_SIZE_THRESHOLD} → z_score, sin anomalía`, async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ fleet_size: 12 }]]) // >=10 → z_score
      .mockResolvedValueOnce([[{ km_per_liter: 10.0 }]])
      .mockResolvedValueOnce([
        [
          // fleetRows — mean=10, std=sqrt(2)
          { km_per_liter: 8 },
          { km_per_liter: 9 },
          { km_per_liter: 10 },
          { km_per_liter: 11 },
          { km_per_liter: 12 },
        ],
      ]);
    const result = await AnomalyDetectionService.compute('unit-3');
    expect(result!.algorithm).toBe('z_score');
    expect(result!.z_score).toBe(0); // (10-10)/sqrt(2)*100 rounded = 0
    expect(result!.is_anomaly).toBe(false);
    expect(result!.deviation_pct).toBeNull();
  });

  it('AD-SVC-5: fleet grande → z_score, anomalía detectada', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ fleet_size: 12 }]])
      .mockResolvedValueOnce([[{ km_per_liter: 15.0 }]]) // unidad muy eficiente → z_score alto
      .mockResolvedValueOnce([
        [
          { km_per_liter: 8 },
          { km_per_liter: 9 },
          { km_per_liter: 10 },
          { km_per_liter: 11 },
          { km_per_liter: 12 },
        ],
      ]);
    const result = await AnomalyDetectionService.compute('unit-4');
    // z = (15-10)/sqrt(2) ≈ 3.54 > Z_SCORE_THRESHOLD(1.5) → anomalía
    expect(result!.algorithm).toBe('z_score');
    expect(result!.z_score).toBeGreaterThan(Z_SCORE_THRESHOLD);
    expect(result!.is_anomaly).toBe(true);
  });

  it('AD-SVC-6: fleet grande, <2 valores en fleet → z_score=null, is_anomaly=false', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]])
      .mockResolvedValueOnce([[{ fleet_size: 12 }]])
      .mockResolvedValueOnce([[{ km_per_liter: 10.0 }]])
      .mockResolvedValueOnce([[{ km_per_liter: 8 }]]); // solo 1 valor → z_score inaplicable
    const result = await AnomalyDetectionService.compute('unit-5');
    expect(result!.algorithm).toBe('z_score');
    expect(result!.z_score).toBeNull();
    expect(result!.is_anomaly).toBe(false);
  });

  it('AD-SVC-7: baselineRows vacío → optional chain ?.km_per_liter short-circuit → unitKmPerLiter=null (B152 FALSE)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ ownerId: 5 }]]) // unitRows
      .mockResolvedValueOnce([[{ fleet_size: 3 }]]) // countRows (<10 → moving_avg)
      .mockResolvedValueOnce([[]]) // baselineRows EMPTY → baselineRows[0] undefined → ?. fires
      .mockResolvedValueOnce([[{ recent_km_per_liter: null }]]); // recentRows
    const result = await AnomalyDetectionService.compute('unit-7');
    expect(result).not.toBeNull();
    expect(result!.baseline_km_per_liter).toBeNull();
    expect(result!.is_anomaly).toBe(false);
  });
});
