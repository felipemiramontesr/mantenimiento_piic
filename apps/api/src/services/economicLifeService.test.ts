import { describe, it, expect } from 'vitest';
import {
  computeResidualValue,
  computeReplacementScore,
  computeRecommendation,
  BASE_VEHICLE_VALUE_MXN,
} from './economicLifeService';

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
