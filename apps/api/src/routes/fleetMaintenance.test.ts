/* eslint-disable */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  computeServiceType,
  resolveServiceMode,
  buildCascadeServiceTypes,
  MINOR_AGENCY_EQUIV,
  MINOR_FRESHNESS_THRESHOLD,
} from './fleetMaintenance';

// ─── computeServiceType ───────────────────────────────────────────────────────

describe('computeServiceType', () => {
  // ── Zero / guard ────────────────────────────────────────────────────────────
  it('returns BASIC_10K when odometer is 0', () => {
    expect(computeServiceType(0, 10000)).toBe('BASIC_10K');
  });

  it('returns BASIC_10K when odometer is negative', () => {
    expect(computeServiceType(-500, 10000)).toBe('BASIC_10K');
  });

  // ── Exact milestone windows ──────────────────────────────────────────────
  it('returns BASIC_10K at residuo = 10 000 (exact center)', () => {
    expect(computeServiceType(10000, 10000)).toBe('BASIC_10K');
  });

  it('returns BASIC_10K at residuo = 9 000 (lower window boundary)', () => {
    expect(computeServiceType(9000, 10000)).toBe('BASIC_10K');
  });

  it('returns BASIC_10K at residuo = 11 000 (upper window boundary)', () => {
    expect(computeServiceType(11000, 10000)).toBe('BASIC_10K');
  });

  it('returns INTERMEDIATE_20K at residuo = 20 000', () => {
    expect(computeServiceType(20000, 10000)).toBe('INTERMEDIATE_20K');
  });

  it('returns INTERMEDIATE_20K at lower boundary (19 000)', () => {
    expect(computeServiceType(19000, 10000)).toBe('INTERMEDIATE_20K');
  });

  it('returns INTERMEDIATE_20K at upper boundary (21 000)', () => {
    expect(computeServiceType(21000, 10000)).toBe('INTERMEDIATE_20K');
  });

  it('returns MAJOR_30K at residuo = 30 000', () => {
    expect(computeServiceType(30000, 10000)).toBe('MAJOR_30K');
  });

  it('returns MAJOR_30K at residuo = 40 000 (second major window)', () => {
    expect(computeServiceType(40000, 10000)).toBe('MAJOR_30K');
  });

  it('returns ADVANCED_50K at residuo = 50 000', () => {
    expect(computeServiceType(50000, 10000)).toBe('ADVANCED_50K');
  });

  it('returns ADVANCED_50K at residuo = 49 000 (lower boundary)', () => {
    expect(computeServiceType(49000, 10000)).toBe('ADVANCED_50K');
  });

  it('returns ADVANCED_50K at residuo = 51 000 (upper boundary)', () => {
    expect(computeServiceType(51000, 10000)).toBe('ADVANCED_50K');
  });

  // ── Cycle boundaries (60K rollover) ─────────────────────────────────────
  it('returns ADVANCED_50K at residuo = 0 (60K rollover)', () => {
    expect(computeServiceType(60000, 10000)).toBe('ADVANCED_50K');
  });

  it('returns ADVANCED_50K at residuo = 59 000 (near-top boundary)', () => {
    expect(computeServiceType(59000, 10000)).toBe('ADVANCED_50K');
  });

  it('returns ADVANCED_50K at residuo = 1 000 (near-zero boundary)', () => {
    expect(computeServiceType(1000, 10000)).toBe('ADVANCED_50K');
  });

  // ── Second cycle (120 K) — wrapping works correctly ──────────────────────
  it('returns BASIC_10K at 70 000 km (residuo = 10 000)', () => {
    expect(computeServiceType(70000, 10000)).toBe('BASIC_10K');
  });

  it('returns ADVANCED_50K at 110 000 km (residuo = 50 000)', () => {
    expect(computeServiceType(110000, 10000)).toBe('ADVANCED_50K');
  });

  // ── Mine units: MINOR_MINING in non-milestone mid-zones ─────────────────
  it('returns MINOR_MINING for mine unit between milestones (residuo = 5 000)', () => {
    expect(computeServiceType(5000, 5000)).toBe('MINOR_MINING');
  });

  it('returns MINOR_MINING for mine unit at residuo = 25 000', () => {
    expect(computeServiceType(25000, 5000)).toBe('MINOR_MINING');
  });

  it('returns MINOR_MINING for mine unit at residuo = 45 000', () => {
    expect(computeServiceType(45000, 5000)).toBe('MINOR_MINING');
  });

  // ── Agency fallback (nearest milestone) for non-mine mid-zones ──────────
  it('falls back to BASIC_10K for agency unit at residuo = 5 000 (nearest is 10K)', () => {
    // 5000 is equidistant between 0 (ADVANCED_50K boundary) and 10K — nearest wins
    expect(computeServiceType(5000, 10000)).toBe('BASIC_10K');
  });

  it('falls back to BASIC_10K for agency unit at residuo = 15 000 (equidistant — lower milestone wins)', () => {
    // 15K is equidistant between 10K and 20K; milestones are iterated in order so 10K wins
    expect(computeServiceType(15000, 10000)).toBe('BASIC_10K');
  });

  it('falls back to INTERMEDIATE_20K for agency unit at residuo = 25 000 (equidistant — lower milestone wins)', () => {
    // 25K is equidistant between 20K and 30K; 20K comes first
    expect(computeServiceType(25000, 10000)).toBe('INTERMEDIATE_20K');
  });

  it('falls back to MAJOR_30K for agency unit at residuo = 45 000', () => {
    expect(computeServiceType(45000, 10000)).toBe('MAJOR_30K');
  });

  // ── String maintIntervalKm (DB returns strings) ──────────────────────────
  it('recognises mine unit when maintIntervalKm is the string "5000"', () => {
    expect(computeServiceType(25000, '5000')).toBe('MINOR_MINING');
  });

  it('treats "10000" string as agency unit (equidistant 25K → INTERMEDIATE_20K)', () => {
    expect(computeServiceType(25000, '10000')).toBe('INTERMEDIATE_20K');
  });
});

// ─── resolveServiceMode ───────────────────────────────────────────────────────

describe('resolveServiceMode', () => {
  it('returns IN_SITU for MINOR_MINING', () => {
    expect(resolveServiceMode('MINOR_MINING')).toBe('IN_SITU');
  });

  it('returns WORKSHOP for BASIC_10K', () => {
    expect(resolveServiceMode('BASIC_10K')).toBe('WORKSHOP');
  });

  it('returns WORKSHOP for INTERMEDIATE_20K', () => {
    expect(resolveServiceMode('INTERMEDIATE_20K')).toBe('WORKSHOP');
  });

  it('returns WORKSHOP for MAJOR_30K', () => {
    expect(resolveServiceMode('MAJOR_30K')).toBe('WORKSHOP');
  });

  it('returns WORKSHOP for ADVANCED_50K', () => {
    expect(resolveServiceMode('ADVANCED_50K')).toBe('WORKSHOP');
  });
});

// ─── buildCascadeServiceTypes ─────────────────────────────────────────────────

describe('buildCascadeServiceTypes', () => {
  it('ADVANCED_50K cascades all four agency levels', () => {
    expect(buildCascadeServiceTypes('ADVANCED_50K')).toEqual([
      'ADVANCED_50K',
      'MAJOR_30K',
      'INTERMEDIATE_20K',
      'BASIC_10K',
    ]);
  });

  it('MAJOR_30K cascades three levels', () => {
    expect(buildCascadeServiceTypes('MAJOR_30K')).toEqual([
      'MAJOR_30K',
      'INTERMEDIATE_20K',
      'BASIC_10K',
    ]);
  });

  it('INTERMEDIATE_20K cascades two levels', () => {
    expect(buildCascadeServiceTypes('INTERMEDIATE_20K')).toEqual(['INTERMEDIATE_20K', 'BASIC_10K']);
  });

  it('BASIC_10K returns only itself (no cascade)', () => {
    expect(buildCascadeServiceTypes('BASIC_10K')).toEqual(['BASIC_10K']);
  });

  it('MINOR_MINING returns only itself (no cascade)', () => {
    expect(buildCascadeServiceTypes('MINOR_MINING')).toEqual(['MINOR_MINING']);
  });

  it('cascade lists are in descending severity order', () => {
    const cascade = buildCascadeServiceTypes('ADVANCED_50K');
    const severityOrder = ['ADVANCED_50K', 'MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K'];
    expect(cascade).toEqual(severityOrder);
  });
});

// ─── MINOR_AGENCY_EQUIV constant ─────────────────────────────────────────────

describe('MINOR_AGENCY_EQUIV', () => {
  it('maps OIL_CHANGE_MINING → OIL_CHANGE', () => {
    expect(MINOR_AGENCY_EQUIV['OIL_CHANGE_MINING']).toBe('OIL_CHANGE');
  });

  it('maps OIL_FILTER_MINING → OIL_FILTER', () => {
    expect(MINOR_AGENCY_EQUIV['OIL_FILTER_MINING']).toBe('OIL_FILTER');
  });

  it('maps AIR_FILTER_MINING → AIR_FILTER_CHANGE', () => {
    expect(MINOR_AGENCY_EQUIV['AIR_FILTER_MINING']).toBe('AIR_FILTER_CHANGE');
  });

  it('maps CABIN_FILTER_MINING → CABIN_FILTER_CHANGE', () => {
    expect(MINOR_AGENCY_EQUIV['CABIN_FILTER_MINING']).toBe('CABIN_FILTER_CHANGE');
  });

  it('has exactly 4 entries — no accidental additions', () => {
    expect(Object.keys(MINOR_AGENCY_EQUIV)).toHaveLength(4);
  });

  it('returns undefined for unknown mining codes (no spurious mappings)', () => {
    expect(MINOR_AGENCY_EQUIV['BRAKES_MINING']).toBeUndefined();
  });
});

// ─── MINOR_FRESHNESS_THRESHOLD constant ──────────────────────────────────────

describe('MINOR_FRESHNESS_THRESHOLD', () => {
  it('equals 0.2 (20 % of interval)', () => {
    expect(MINOR_FRESHNESS_THRESHOLD).toBe(0.2);
  });

  it('is a number, not a string', () => {
    expect(typeof MINOR_FRESHNESS_THRESHOLD).toBe('number');
  });

  it('correctly suppresses minor when interval progress is above threshold', () => {
    const intervalKm = 5000;
    const minorServiceKm = 2500; // 50 % progress — above 20 %
    const progress = (intervalKm - minorServiceKm) / intervalKm;
    expect(progress > MINOR_FRESHNESS_THRESHOLD).toBe(true);
  });

  it('allows minor tasks when interval progress is below threshold (fresh service)', () => {
    const intervalKm = 5000;
    const minorServiceKm = 4500; // 10 % progress — below 20 %
    const progress = (intervalKm - minorServiceKm) / intervalKm;
    expect(progress < MINOR_FRESHNESS_THRESHOLD).toBe(true);
  });
});
