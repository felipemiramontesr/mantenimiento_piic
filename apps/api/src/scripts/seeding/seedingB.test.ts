import { describe, it, expect } from 'vitest';
import {
  SEED_B_TAG,
  PIIC101_TRANSACTIONS,
  PIIC101_INCIDENTS,
  PIIC201_TRANSACTIONS,
  PIIC202_INCIDENTS,
  PIIC301_TRANSACTIONS,
  PIIC301_INCIDENTS,
  PIIC302_TRANSACTIONS,
  PIIC303_TRANSACTIONS,
  PIIC304_TRANSACTIONS,
  PIIC305_TRANSACTIONS,
  ALL_UNIT_B_SEEDING,
} from './seedBData';

// ─── FC DataResilience_NHTSAIntegration — FaseB Tests ────────────────────────
// SEED-B-1: accumulated_tco > 0 todas las unidades
// SEED-B-2: PIIC-303 → REPLACE (tco >= 90,000)
// SEED-B-3: PIIC-301 → EVALUATE (45,000 <= tco < 90,000)
// SEED-B-4: PIIC-301 quality_factor = 0.00 (100% de rutas con incident)

const BASE_RESIDUAL = 90_000; // residualValue para unidades 2018-2022 en 2026

function totalTco(transactions: typeof PIIC101_TRANSACTIONS): number {
  return transactions.reduce((s, t) => s + t.amount, 0);
}

describe('DataResilience FaseB — Financial & Incidents data integrity', () => {
  it('SEED-B-1: todas las unidades tienen TCO positivo (> 0)', () => {
    ALL_UNIT_B_SEEDING.filter((u) =>
      ['PIIC-101', 'PIIC-201', 'PIIC-202', 'PIIC-301', 'PIIC-302', 'PIIC-303'].includes(u.unitId)
    ).forEach(({ unitId, transactions }) => {
      const tco = totalTco(transactions);
      expect(tco, `${unitId} debe tener TCO > 0`).toBeGreaterThan(0);
    });
  });

  it('SEED-B-2: PIIC-303 TCO >= 90,000 → recommendation REPLACE', () => {
    const tco = totalTco(PIIC303_TRANSACTIONS);
    expect(tco).toBeGreaterThanOrEqual(BASE_RESIDUAL);
    const score = tco / BASE_RESIDUAL;
    expect(score, 'replacementScore debe ser >= 1.0').toBeGreaterThanOrEqual(1.0);
  });

  it('SEED-B-3: PIIC-301 TCO en [45,000, 90,000) → recommendation EVALUATE', () => {
    const tco = totalTco(PIIC301_TRANSACTIONS);
    expect(tco, 'TCO debe >= 45,000 (umbral EVALUATE)').toBeGreaterThanOrEqual(45_000);
    expect(tco, 'TCO debe < 90,000 (no REPLACE)').toBeLessThan(BASE_RESIDUAL);
    const score = tco / BASE_RESIDUAL;
    expect(score, 'replacementScore en [0.5, 1.0)').toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThan(1.0);
  });

  it('SEED-B-4: PIIC-301 tiene 48 incidents — quality_factor = 0.00 (100% rutas)', () => {
    expect(PIIC301_INCIDENTS).toHaveLength(48);
    const indices = PIIC301_INCIDENTS.map((i) => i.routeIndex);
    expect(new Set(indices).size).toBe(48);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);
    expect(minIdx).toBe(0);
    expect(maxIdx).toBe(47);
  });

  it('SEED-B-5: PIIC-201 tiene exactamente 1 REPAIR >= $90,000 (EC-2 motor completo)', () => {
    const bigRepairs = PIIC201_TRANSACTIONS.filter(
      (t) => t.category === 'REPAIR' && t.amount >= 90_000
    );
    expect(bigRepairs).toHaveLength(1);
    expect(bigRepairs[0].amount).toBe(95_000);
  });

  it('SEED-B-6: PIIC-303 tiene exactamente 3 REPAIR a $0.00 (garantía EC-2)', () => {
    const warranty = PIIC303_TRANSACTIONS.filter((t) => t.category === 'REPAIR' && t.amount === 0);
    expect(warranty).toHaveLength(3);
    warranty.forEach((w) => {
      expect(w.vendor).toBe('Distribuidor Nissan');
    });
  });

  it('SEED-B-7: PIIC-202 tiene 0 incidents — quality_factor = 1.0 (EC-2 perfect compliance)', () => {
    expect(PIIC202_INCIDENTS).toHaveLength(0);
  });

  it('SEED-B-8: PIIC-101 tiene incidents en índices 4-8 (rutas julio 2025)', () => {
    const indices = PIIC101_INCIDENTS.map((i) => i.routeIndex);
    expect(indices).toEqual([4, 5, 6, 7, 8]);
    PIIC101_INCIDENTS.forEach((inc) => {
      expect(inc.severity).toBe('HIGH');
      expect(inc.description).toContain('[SEED_B]');
    });
  });

  it('SEED-B-9: PIIC-303 TCO de 117,000 — correcta suma sin contar garantías $0', () => {
    const tco = totalTco(PIIC303_TRANSACTIONS);
    expect(tco).toBe(117_000);
  });

  it('SEED-B-10: PIIC-302 TCO máximo > PIIC-303 (EC-2)', () => {
    const tco302 = totalTco(PIIC302_TRANSACTIONS);
    const tco303 = totalTco(PIIC303_TRANSACTIONS);
    expect(tco302).toBeGreaterThan(tco303);
    expect(tco302).toBe(205_000);
  });

  it('SEED-B-11: VIM — PIIC-304/305 tienen transacciones para FaseF confidence_score', () => {
    expect(totalTco(PIIC304_TRANSACTIONS)).toBeGreaterThan(0);
    expect(totalTco(PIIC305_TRANSACTIONS)).toBeGreaterThan(0);
    expect(PIIC304_TRANSACTIONS.some((t) => t.category === 'LEASE')).toBe(true);
  });

  it('SEED-B-12: todos los notes son SEED_B_TAG para idempotencia', () => {
    ALL_UNIT_B_SEEDING.forEach(({ unitId, transactions }) => {
      transactions.forEach((t) => {
        expect(t.notes, `${unitId} transacción debe tener notes="${SEED_B_TAG}"`).toBe(SEED_B_TAG);
      });
    });
  });

  it('SEED-B-13: PIIC-101 TCO > PIIC-301 TCO (unidad más costosa vs EVALUATE boundary)', () => {
    expect(totalTco(PIIC101_TRANSACTIONS)).toBeGreaterThan(totalTco(PIIC301_TRANSACTIONS));
  });

  it('SEED-B-14: SEED_B_TAG es string "SEED_B"', () => {
    expect(SEED_B_TAG).toBe('SEED_B');
  });
});
