import { describe, it, expect } from 'vitest';
import {
  PIIC101_SCHEDULE,
  PIIC201_SCHEDULE,
  PIIC202_SCHEDULE,
  PIIC301_SCHEDULE,
  PIIC302_SCHEDULE,
  PIIC303_SCHEDULE,
  PIIC304_SCHEDULE,
  PIIC305_SCHEDULE,
  SEED_A_TAG,
} from './seedAData';

// ─── FC DataResilience_NHTSAIntegration — FaseA Tests ────────────────────────
// SEED-A-1: Volume — all units have >= 48 routes
// SEED-A-2: EC-1 PIIC-101 fuel theft signal detectable
// SEED-A-3: EC-1 PIIC-302 star performer avg km/L correct

describe('DataResilience FaseA — Seeding data integrity', () => {
  it('SEED-A-1: every unit schedule has at least 48 routes', () => {
    const schedules = [
      { id: 'PIIC-101', s: PIIC101_SCHEDULE },
      { id: 'PIIC-201', s: PIIC201_SCHEDULE },
      { id: 'PIIC-202', s: PIIC202_SCHEDULE },
      { id: 'PIIC-301', s: PIIC301_SCHEDULE },
      { id: 'PIIC-302', s: PIIC302_SCHEDULE },
      { id: 'PIIC-303', s: PIIC303_SCHEDULE },
      { id: 'PIIC-304', s: PIIC304_SCHEDULE },
      { id: 'PIIC-305', s: PIIC305_SCHEDULE },
    ];
    schedules.forEach(({ id, s }) => {
      expect(s.length, `${id} must have >= 48 routes`).toBeGreaterThanOrEqual(48);
    });
  });

  it('SEED-A-2: PIIC-101 has exactly one anomalous route with 250L (0.8 km/L)', () => {
    const anomalous = PIIC101_SCHEDULE.filter((r) => r.liters === 250);
    expect(anomalous).toHaveLength(1);
    const { km, liters } = anomalous[0];
    const kmpl = km / liters;
    expect(kmpl).toBeCloseTo(0.8, 1);
  });

  it('SEED-A-2: PIIC-101 recent period (routes 46-59) deviates >20% from baseline', () => {
    const baselineRoutes = PIIC101_SCHEDULE.slice(0, 45);
    const recentRoutes = PIIC101_SCHEDULE.slice(45);
    const baselineKmpl =
      baselineRoutes.reduce((s, r) => s + r.km, 0) /
      baselineRoutes.reduce((s, r) => s + r.liters, 0);
    const recentKmpl =
      recentRoutes.reduce((s, r) => s + r.km, 0) / recentRoutes.reduce((s, r) => s + r.liters, 0);
    const deviationAbs = Math.abs((recentKmpl - baselineKmpl) / baselineKmpl);
    expect(deviationAbs, 'recent deviation must exceed 20% anomaly threshold').toBeGreaterThan(0.2);
  });

  it('SEED-A-3: PIIC-302 all routes are 400km/28L → 14.29 km/L (star performer)', () => {
    const totalKm = PIIC302_SCHEDULE.reduce((s, r) => s + r.km, 0);
    const totalL = PIIC302_SCHEDULE.reduce((s, r) => s + r.liters, 0);
    const avgKmpl = totalKm / totalL;
    expect(avgKmpl).toBeCloseTo(14.29, 1);
    expect(PIIC302_SCHEDULE).toHaveLength(60);
  });

  it('SEED-A-3: PIIC-302 route 30 is the checkpoint candidate (index 30 exists)', () => {
    expect(PIIC302_SCHEDULE[30]).toBeDefined();
    expect(PIIC302_SCHEDULE[30].km).toBe(400);
  });

  it('SEED-A-1: PIIC-201 blackout enforced — no routes between days 196-270', () => {
    const blackoutRoutes = PIIC201_SCHEDULE.filter((r) => r.days >= 196 && r.days <= 270);
    expect(blackoutRoutes).toHaveLength(0);
  });

  it('SEED-A-1: PIIC-201 has 4 distinct drivers (EC-1 driver churn)', () => {
    const driverIds = new Set(PIIC201_SCHEDULE.map((r) => r.driverId));
    expect(driverIds.size).toBe(4);
  });

  it('SEED-A-1: PIIC-301 dormant — last route day <= 293 (~Mar 23 2026)', () => {
    const maxDay = Math.max(...PIIC301_SCHEDULE.map((r) => r.days));
    expect(maxDay).toBeLessThanOrEqual(293);
  });

  it('SEED-A-1: FaseF — PIIC-303/304/305 same route profile (60 normal routes)', () => {
    expect(PIIC303_SCHEDULE).toHaveLength(60);
    expect(PIIC304_SCHEDULE).toHaveLength(60);
    expect(PIIC305_SCHEDULE).toHaveLength(60);
  });

  it('SEED-A-1: SEED_A_TAG is defined', () => {
    expect(SEED_A_TAG).toBe('SEED_A');
  });
});
