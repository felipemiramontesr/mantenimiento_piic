import { describe, it, expect } from 'vitest';
import {
  computeZScore,
  computeDeviationPct,
  MOVING_AVG_DEVIATION_THRESHOLD,
  Z_SCORE_THRESHOLD,
} from './anomalyDetectionService';

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
