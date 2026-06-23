/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EconomicLifeService, {
  computeResidualValue,
  computeReplacementScore,
  computeRecommendation,
  BASE_VEHICLE_VALUE_MXN,
} from './economicLifeService';
import db from './db';

vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('computeResidualValue', () => {
  it('EL-PURE-1: vehículo nuevo (0 años) → valor base completo', () => {
    expect(computeResidualValue(2026, 2026)).toBe(450_000);
  });

  it('EL-PURE-2: vehículo de 1 año → 75% del valor base', () => {
    expect(computeResidualValue(2025, 2026)).toBe(337_500);
  });

  it('EL-PURE-3: vehículo de 4 años → 0% depreciación real, 20% floor residual (SAT)', () => {
    // 4 años × 25% = 100%, pero cap en 80% → residual = 20%
    expect(computeResidualValue(2022, 2026)).toBe(90_000);
  });

  it('EL-PURE-4: vehículo de 10 años → mismo 20% floor residual (cap)', () => {
    expect(computeResidualValue(2016, 2026)).toBe(90_000);
  });

  it('EL-PURE-5: año futuro/inválido → valor base completo (ageYears = 0)', () => {
    expect(computeResidualValue(2030, 2026)).toBe(450_000);
  });

  it('EL-PURE-6: vehículo de 2 años → 50% del valor base', () => {
    const residual = computeResidualValue(2024, 2026);
    expect(residual).toBe(Math.round(BASE_VEHICLE_VALUE_MXN * 0.5));
  });
});

describe('computeReplacementScore', () => {
  it('EL-PURE-7: sin TCO acumulado → score 0', () => {
    expect(computeReplacementScore(0, 450_000)).toBe(0);
  });

  it('EL-PURE-8: TCO = residual → score exactamente 1.0', () => {
    expect(computeReplacementScore(90_000, 90_000)).toBe(1.0);
  });

  it('EL-PURE-9: TCO mitad del residual → score 0.5', () => {
    expect(computeReplacementScore(45_000, 90_000)).toBe(0.5);
  });

  it('EL-PURE-10: TCO supera residual → score > 1.0', () => {
    expect(computeReplacementScore(150_000, 90_000)).toBeCloseTo(1.67, 1);
  });

  it('EL-PURE-11: residual <= 0 → score forzado a 1.0', () => {
    expect(computeReplacementScore(50_000, 0)).toBe(1.0);
  });
});

describe('computeResidualValue — AT-DH-A-9: custom baseValue (FC-7 FaseA)', () => {
  it('AT-DH-A-9a: custom baseValue 650,000 MXN produces higher residual than default 450,000', () => {
    const residualDefault = computeResidualValue(2020, 2026);
    const residualCustom = computeResidualValue(2020, 2026, 650_000);
    expect(residualCustom).toBeGreaterThan(residualDefault);
  });

  it('AT-DH-A-9b: baseValue 650,000 vehículo 6 años → 20% floor = 130,000', () => {
    // 6 años × 25% = 150%, cap en 80% → residual = 20% de 650,000 = 130,000
    expect(computeResidualValue(2020, 2026, 650_000)).toBe(130_000);
  });

  it('AT-DH-A-9c: baseValue omitted falls back to BASE_VEHICLE_VALUE_MXN (450,000)', () => {
    expect(computeResidualValue(2026, 2026)).toBe(450_000);
    expect(computeResidualValue(2026, 2026, 450_000)).toBe(450_000);
  });
});

describe('computeRecommendation', () => {
  it('EL-PURE-12: score < 0.5 → KEEP', () => {
    expect(computeRecommendation(0.49)).toBe('KEEP');
    expect(computeRecommendation(0)).toBe('KEEP');
  });

  it('EL-PURE-13: score entre 0.5 y 0.99 → EVALUATE', () => {
    expect(computeRecommendation(0.5)).toBe('EVALUATE');
    expect(computeRecommendation(0.99)).toBe('EVALUATE');
  });

  it('EL-PURE-14: score >= 1.0 → REPLACE', () => {
    expect(computeRecommendation(1.0)).toBe('REPLACE');
    expect(computeRecommendation(1.5)).toBe('REPLACE');
  });
});

describe('EconomicLifeService.compute — AT-DH-A-10: acquisitionCost dinámico (FC-7 FaseA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-DH-A-10a: usa acquisitionCost de DB cuando está disponible (no usa 450,000)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, year: 2020, acquisitionCost: 650000 }]])
      .mockResolvedValueOnce([[{ tco_total: 50000 }]]);
    const result = await EconomicLifeService.compute('PIIC-304', 2026);
    expect(result).not.toBeNull();
    // residual con 650,000: 6 años → 20% floor = 130,000
    expect(result!.residual_value_mxn).toBe(130_000);
  });

  it('AT-DH-A-10b: fallback a 450,000 cuando acquisitionCost es null', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, year: 2020, acquisitionCost: null }]])
      .mockResolvedValueOnce([[{ tco_total: 0 }]]);
    const result = await EconomicLifeService.compute('PIIC-X', 2026);
    expect(result).not.toBeNull();
    // residual con 450,000: 6 años → 20% floor = 90,000
    expect(result!.residual_value_mxn).toBe(90_000);
  });

  it('AT-DH-A-10c: retorna null si la unidad no existe', async () => {
    (db.execute as any).mockResolvedValueOnce([[]]); // no rows
    const result = await EconomicLifeService.compute('GHOST');
    expect(result).toBeNull();
  });
});
