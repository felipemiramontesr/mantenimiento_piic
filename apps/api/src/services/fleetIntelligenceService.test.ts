import { describe, it, expect } from 'vitest';
import { computeOee, computeTcoPerKm } from './fleetIntelligenceService';

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
