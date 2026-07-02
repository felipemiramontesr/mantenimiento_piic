/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Co2Service, {
  computeCo2Kg,
  resolveCo2Factor,
  CO2_FACTORS,
  DEFAULT_CO2_FACTOR,
} from './co2Service';
import db from './db';

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

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

describe('Co2Service.compute — AT-DH-C: period_from/period_to derivado (FC-7 FaseC)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-DH-C-1: sin params → period_from derivado de MIN(start_at)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [
          {
            total_liters: 300,
            period_from_derived: '2026-01-10 08:00:00',
            period_to_derived: '2026-06-23 16:00:00',
          },
        ],
      ]);
    const result = await Co2Service.compute('PIIC-304');
    expect(result).not.toBeNull();
    expect(result!.period_from).toBe('2026-01-10 08:00:00');
  });

  it('AT-DH-C-2: sin params → period_to derivado de MAX(start_at)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [
          {
            total_liters: 300,
            period_from_derived: '2026-01-10 08:00:00',
            period_to_derived: '2026-06-23 16:00:00',
          },
        ],
      ]);
    const result = await Co2Service.compute('PIIC-304');
    expect(result!.period_to).toBe('2026-06-23 16:00:00');
  });

  it('AT-DH-C-3: con params explícitos → usa params, no los derivados', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [
          {
            total_liters: 150,
            period_from_derived: '2026-03-01 00:00:00',
            period_to_derived: '2026-03-31 23:59:59',
          },
        ],
      ]);
    const result = await Co2Service.compute('PIIC-304', {
      from: '2026-03-01',
      to: '2026-04-01',
    });
    expect(result!.period_from).toBe('2026-03-01');
    expect(result!.period_to).toBe('2026-04-01');
  });

  it('AT-DH-C-4: sin movimientos → period_from y period_to son null', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [
          {
            total_liters: 0,
            period_from_derived: null,
            period_to_derived: null,
          },
        ],
      ]);
    const result = await Co2Service.compute('PIIC-304');
    expect(result!.period_from).toBeNull();
    expect(result!.period_to).toBeNull();
  });

  it('AT-DH-C-5: solo from (sin to) → rama else if (periodFrom) cubierta', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [
          {
            total_liters: 150,
            period_from_derived: '2026-01-01',
            period_to_derived: '2026-06-30 23:59:59',
          },
        ],
      ]);
    const result = await Co2Service.compute('PIIC-304', { from: '2026-01-01' });
    expect(result).not.toBeNull();
    expect(result!.total_liters).toBe(150);
    expect(result!.period_from).toBe('2026-01-01');
  });

  it('AT-DH-C-6: solo to (sin from) → rama else if (periodTo) cubierta', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([
        [{ total_liters: 80, period_from_derived: '2025-01-01', period_to_derived: '2026-03-31' }],
      ]);
    const result = await Co2Service.compute('PIIC-304', { to: '2026-03-31' });
    expect(result).not.toBeNull();
    expect(result!.total_liters).toBe(80);
  });

  it('AT-DH-C-7: sin movimientos en rama from+to → ?? 0 y ?? null cubiertos (lines 78-80)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([[]]); // empty rows → rows[0] = undefined
    const result = await Co2Service.compute('PIIC-304', { from: '2026-01-01', to: '2026-06-30' });
    expect(result!.total_liters).toBe(0);
    expect(result!.period_from).toBe('2026-01-01');
    expect(result!.period_to).toBe('2026-06-30');
  });

  it('AT-DH-C-8: sin movimientos en rama periodFrom → ?? 0 y ?? null cubiertos (lines 86-88)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([[]]); // empty rows
    const result = await Co2Service.compute('PIIC-304', { from: '2026-01-01' });
    expect(result!.total_liters).toBe(0);
    expect(result!.period_from).toBe('2026-01-01');
    expect(result!.period_to).toBeNull();
  });

  it('AT-DH-C-9: sin movimientos en rama periodTo → ?? 0 y ?? null cubiertos (lines 94-96)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([[]]); // empty rows
    const result = await Co2Service.compute('PIIC-304', { to: '2026-06-30' });
    expect(result!.total_liters).toBe(0);
    expect(result!.period_from).toBeNull();
    expect(result!.period_to).toBe('2026-06-30');
  });

  it('AT-DH-C-10: sin movimientos en rama else (sin params) → ?? 0 cubierto (line 99)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: 'F_DIESEL' }]])
      .mockResolvedValueOnce([[]]); // empty rows → rows[0] undefined → total_liters ?? 0 takes right side
    const result = await Co2Service.compute('PIIC-304');
    expect(result!.total_liters).toBe(0);
    expect(result!.period_from).toBeNull();
    expect(result!.period_to).toBeNull();
  });

  it('AT-DH-C-11: unidad no encontrada → null (B50[1] — if unitRows.length===0 TRUE)', async () => {
    (db.execute as any).mockResolvedValueOnce([[]]); // unitRows empty → return null
    const result = await Co2Service.compute('PIIC-999');
    expect(result).toBeNull();
  });

  it('AT-DH-C-12: fuel_code null en BD → fuelCode=null ?? null right-side (B53[0]) + resolveCo2Factor(null)=DEFAULT', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ ownerId: 1, fuel_code: null }]]) // fuel_code null → ?? null right-side
      .mockResolvedValueOnce([
        [{ total_liters: 100, period_from_derived: null, period_to_derived: null }],
      ]);
    const result = await Co2Service.compute('PIIC-305');
    expect(result).not.toBeNull();
    expect(result!.fuel_code).toBeNull();
    expect(result!.co2_factor_kg_per_liter).toBe(DEFAULT_CO2_FACTOR); // resolveCo2Factor(null)
    expect(result!.total_liters).toBe(100);
    expect(result!.total_co2_kg).toBe(231); // 100 * 2.31
  });
});
