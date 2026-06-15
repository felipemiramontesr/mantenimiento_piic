/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkHoyNoCircula,
  predecirHologramaYEngomado,
  calcularVencimientoVerificacion,
} from './fleetCompliance';

/**
 * 🔱 Archon Compliance Engine: Hoy No Circula Logic Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

describe('Fleet Compliance Engine (Hoy No Circula)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return non-restricted for exempt holograms (00, 0, Exento)', () => {
    expect(checkHoyNoCircula('00', 'ABC-123')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
    expect(checkHoyNoCircula('0', 'XYZ-987')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
    expect(checkHoyNoCircula('Exento', 'K-123-L')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
  });

  it('should return false if hologram or plates are missing', () => {
    expect(checkHoyNoCircula(null, 'ABC-123').isRestricted).toBe(false);
    expect(checkHoyNoCircula('1', null).isRestricted).toBe(false);
  });

  it('should handle plates with no digits gracefully', () => {
    expect(checkHoyNoCircula('1', 'ABC').isRestricted).toBe(false);
  });

  it('should restrict plates ending in 5 or 6 on Mondays', () => {
    const monday = new Date('2026-03-09T12:00:00Z'); // Monday
    vi.setSystemTime(monday);

    expect(checkHoyNoCircula('1', 'ABC-5').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-6').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'DEF-0').isRestricted).toBe(false);
  });

  it('should restrict plates ending in 7 or 8 on Tuesdays', () => {
    const tuesday = new Date('2026-03-10T12:00:00Z'); // Tuesday
    vi.setSystemTime(tuesday);

    expect(checkHoyNoCircula('1', 'ABC-7').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-8').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 3 or 4 on Wednesdays', () => {
    const wednesday = new Date('2026-03-11T12:00:00Z'); // Wednesday
    vi.setSystemTime(wednesday);

    expect(checkHoyNoCircula('1', 'ABC-3').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-4').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 1 or 2 on Thursdays', () => {
    const thursday = new Date('2026-03-12T12:00:00Z'); // Thursday
    vi.setSystemTime(thursday);

    expect(checkHoyNoCircula('1', 'ABC-1').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-2').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 9 or 0 on Fridays', () => {
    const friday = new Date('2026-03-13T12:00:00Z'); // Friday
    vi.setSystemTime(friday);

    expect(checkHoyNoCircula('1', 'ABC-9').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-0').isRestricted).toBe(true);
  });

  it('should restrict all Hologram 2 vehicles on Saturdays', () => {
    const saturday = new Date('2026-03-14T12:00:00Z'); // Saturday
    vi.setSystemTime(saturday);

    expect(checkHoyNoCircula('2', 'ABC-1').isRestricted).toBe(true);
  });

  it('should restrict Hologram 1 with odd plates on 1st and 3rd Saturdays', () => {
    const firstSaturday = new Date('2026-03-07T12:00:00Z'); // 1st Sat
    vi.setSystemTime(firstSaturday);
    expect(checkHoyNoCircula('1', 'ABC-1').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'ABC-2').isRestricted).toBe(false);

    const thirdSaturday = new Date('2026-03-21T12:00:00Z'); // 3rd Sat
    vi.setSystemTime(thirdSaturday);
    expect(checkHoyNoCircula('1', 'ABC-5').isRestricted).toBe(true);
  });

  it('should restrict Hologram 1 with even plates on 2nd and 4th Saturdays', () => {
    const secondSaturday = new Date('2026-03-14T12:00:00Z'); // 2nd Sat
    vi.setSystemTime(secondSaturday);
    expect(checkHoyNoCircula('1', 'ABC-2').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'ABC-3').isRestricted).toBe(false);

    const fourthSaturday = new Date('2026-03-28T12:00:00Z'); // 4th Sat
    vi.setSystemTime(fourthSaturday);
    expect(checkHoyNoCircula('1', 'ABC-0').isRestricted).toBe(true);
  });

  it('should allow circulation on Sundays', () => {
    const sunday = new Date('2026-03-15T12:00:00Z'); // Sunday
    vi.setSystemTime(sunday);

    expect(checkHoyNoCircula('2', 'ABC-1').isRestricted).toBe(false);
  });
});

// ─── predecirHologramaYEngomado ───────────────────────────────────────────────

describe('predecirHologramaYEngomado', () => {
  it('returns placeholder when placas is null', () => {
    const result = predecirHologramaYEngomado(null, 2022, null);
    expect(result.hologramaSugerido).toBe('0');
    expect(result.mesesVerificacion).toContain('Captura');
  });

  it('detects electric/hybrid plates (prefix E)', () => {
    const result = predecirHologramaYEngomado('E-ABC-001', 2023, null);
    expect(result.hologramaSugerido).toBe('Exento');
    expect(result.engomadoColor).toBe('Exento');
    expect(result.mesesVerificacion).toBe('No aplica (Exento)');
  });

  it('detects electric by assetTypeCode AT_ELEC', () => {
    const result = predecirHologramaYEngomado('ABC-123', 2023, 'AT_ELEC');
    expect(result.hologramaSugerido).toBe('Exento');
  });

  it('detects foráneo plates', () => {
    const result = predecirHologramaYEngomado('FOR-123', 2020, null);
    expect(result.hologramaSugerido).toBe('Foráneo');
    expect(result.mesesVerificacion).toBe('No aplica (Foráneo)');
  });

  it('suggests hologram 00 for year >= 2023', () => {
    const result = predecirHologramaYEngomado('ABC-123', 2024, null);
    expect(result.hologramaSugerido).toBe('00');
  });

  it('suggests hologram 0 for year 2018-2022', () => {
    expect(predecirHologramaYEngomado('ABC-123', 2020, null).hologramaSugerido).toBe('0');
    expect(predecirHologramaYEngomado('ABC-123', 2018, null).hologramaSugerido).toBe('0');
  });

  it('suggests hologram 1 for year 2016-2017', () => {
    expect(predecirHologramaYEngomado('ABC-123', 2016, null).hologramaSugerido).toBe('1');
    expect(predecirHologramaYEngomado('ABC-123', 2017, null).hologramaSugerido).toBe('1');
  });

  it('suggests hologram 2 for year < 2016', () => {
    expect(predecirHologramaYEngomado('ABC-123', 2010, null).hologramaSugerido).toBe('2');
  });

  it('returns correct engomado color by last digit', () => {
    expect(predecirHologramaYEngomado('ABC-5', 2020, null).engomadoColor).toBe('Amarillo');
    expect(predecirHologramaYEngomado('ABC-7', 2020, null).engomadoColor).toBe('Rosa');
    expect(predecirHologramaYEngomado('ABC-3', 2020, null).engomadoColor).toBe('Rojo');
    expect(predecirHologramaYEngomado('ABC-1', 2020, null).engomadoColor).toBe('Verde');
    expect(predecirHologramaYEngomado('ABC-9', 2020, null).engomadoColor).toBe('Azul');
    expect(predecirHologramaYEngomado('ABC-0', 2020, null).engomadoColor).toBe('Azul');
  });

  it('handles null year gracefully', () => {
    const result = predecirHologramaYEngomado('ABC-5', null, null);
    expect(result.hologramaSugerido).toBe('0');
    expect(result.engomadoColor).toBe('Amarillo');
  });
});

// ─── calcularVencimientoVerificacion ─────────────────────────────────────────

describe('calcularVencimientoVerificacion', () => {
  it('returns undefined when lastVerification is null', () => {
    expect(calcularVencimientoVerificacion(null, '1')).toBeUndefined();
  });

  it('returns undefined when hologram is null', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', null)).toBeUndefined();
  });

  it('returns undefined for holograma 00 (exento)', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', '00')).toBeUndefined();
  });

  it('returns undefined for holograma Exento', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', 'Exento')).toBeUndefined();
  });

  it('returns undefined for holograma Foráneo', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', 'Foráneo')).toBeUndefined();
  });

  it('adds 12 months for holograma 0 (anual)', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', '0')).toBe('2027-03-15');
  });

  it('adds 6 months for holograma 1 (semestral)', () => {
    expect(calcularVencimientoVerificacion('2026-03-15', '1')).toBe('2026-09-15');
  });

  it('adds 6 months for holograma 2 (semestral)', () => {
    expect(calcularVencimientoVerificacion('2026-06-01', '2')).toBe('2026-12-01');
  });

  it('handles full ISO string input (normalizes to date-only first)', () => {
    expect(calcularVencimientoVerificacion('2026-03-15T06:00:00.000Z', '1')).toBe('2026-09-15');
  });
});
