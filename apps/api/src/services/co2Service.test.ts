import { describe, it, expect } from 'vitest';
import { computeCo2Kg, resolveCo2Factor, CO2_FACTORS, DEFAULT_CO2_FACTOR } from './co2Service';

describe('computeCo2Kg', () => {
  it('CO2-PURE-1: 100L de diesel → 268 kg CO2', () => {
    expect(computeCo2Kg(100, CO2_FACTORS.F_DIESEL)).toBe(268);
  });

  it('CO2-PURE-2: 100L de gasolina → 231 kg CO2', () => {
    expect(computeCo2Kg(100, CO2_FACTORS.F_GAS)).toBe(231);
  });

  it('CO2-PURE-3: 100L de gas LP → 196 kg CO2', () => {
    expect(computeCo2Kg(100, CO2_FACTORS.F_LP_GAS)).toBe(196);
  });

  it('CO2-PURE-4: 0 litros → 0 kg CO2', () => {
    expect(computeCo2Kg(0, CO2_FACTORS.F_DIESEL)).toBe(0);
  });

  it('CO2-PURE-5: fracción de litros → redondeo a 2 decimales', () => {
    expect(computeCo2Kg(50.5, CO2_FACTORS.F_DIESEL)).toBe(135.34);
  });
});

describe('resolveCo2Factor', () => {
  it('CO2-PURE-6: F_DIESEL → 2.68', () => {
    expect(resolveCo2Factor('F_DIESEL')).toBe(2.68);
  });

  it('CO2-PURE-7: F_GAS → 2.31', () => {
    expect(resolveCo2Factor('F_GAS')).toBe(2.31);
  });

  it('CO2-PURE-8: F_LP_GAS → 1.96', () => {
    expect(resolveCo2Factor('F_LP_GAS')).toBe(1.96);
  });

  it('CO2-PURE-9: código desconocido → DEFAULT_CO2_FACTOR (gasolina)', () => {
    expect(resolveCo2Factor('F_UNKNOWN')).toBe(DEFAULT_CO2_FACTOR);
  });

  it('CO2-PURE-10: null (sin tipo de combustible) → DEFAULT_CO2_FACTOR', () => {
    expect(resolveCo2Factor(null)).toBe(DEFAULT_CO2_FACTOR);
  });
});
