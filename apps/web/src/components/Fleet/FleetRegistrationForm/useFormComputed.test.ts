import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFormComputed } from './useFormComputed';
import { calculateMaintForecast } from '../../../utils/fleetPredictiveEngine';
import {
  predecirHologramaYEngomado,
  calcularVencimientoVerificacion,
} from '../../../utils/fleetCompliance';
import { CreateFleetUnit, CatalogOption } from '../../../types/fleet';

/**
 * FC162 F2 — useFormComputed.ts had no dedicated test — only indirectly
 * exercised via FleetRegistrationForm.test.tsx's render (no branch
 * targeting). The 3 utils it orchestrates already have their own suites
 * (fleetPredictiveEngine.test.ts, fleetCompliance.test.ts) — mocked here to
 * isolate this hook's own orchestration: canSubmit, the KM/time forecast
 * fallback, and the auto-complete-hologram effect.
 */

vi.mock('../../../utils/fleetPredictiveEngine', () => ({ calculateMaintForecast: vi.fn() }));
vi.mock('../../../utils/fleetCompliance', () => ({
  predecirHologramaYEngomado: vi.fn(),
  calcularVencimientoVerificacion: vi.fn(),
}));

const ASSET_TYPES: CatalogOption[] = [
  { id: 1, label: 'Vehículo', code: 'VEHICULO' } as CatalogOption,
];

const VALID_UNIT: CreateFleetUnit = {
  assetTypeId: 1,
  brandId: 1,
  modelId: 1,
  id: 'ASM-001',
  traccionId: 1,
  transmisionId: 1,
  fuelTypeId: 1,
  operationalUseId: 1,
  dailyUsageAvg: 40,
  year: 2023,
} as CreateFleetUnit;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(predecirHologramaYEngomado).mockReturnValue({
    hologramaSugerido: '00',
  } as never);
  vi.mocked(calcularVencimientoVerificacion).mockReturnValue(undefined);
});

describe('useFormComputed — canSubmit', () => {
  it('is true when every required field is present and dailyUsageAvg > 0', () => {
    const { result } = renderHook(() => useFormComputed(VALID_UNIT, vi.fn(), ASSET_TYPES, false));
    expect(result.current.canSubmit).toBe(true);
  });

  it('is false when a required catalog id is missing', () => {
    const { result } = renderHook(() =>
      useFormComputed({ ...VALID_UNIT, brandId: null }, vi.fn(), ASSET_TYPES, false)
    );
    expect(result.current.canSubmit).toBe(false);
  });

  it('is false when the year predates 1990', () => {
    const { result } = renderHook(() =>
      useFormComputed({ ...VALID_UNIT, year: 1985 }, vi.fn(), ASSET_TYPES, false)
    );
    expect(result.current.canSubmit).toBe(false);
  });

  it('is false when dailyUsageAvg is 0 or missing', () => {
    const { result } = renderHook(() =>
      useFormComputed({ ...VALID_UNIT, dailyUsageAvg: 0 }, vi.fn(), ASSET_TYPES, false)
    );
    expect(result.current.canSubmit).toBe(false);
  });

  it('requires departmentId only when isFlotillaOrInternal is true', () => {
    const { result: withoutDept } = renderHook(() =>
      useFormComputed(VALID_UNIT, vi.fn(), ASSET_TYPES, false)
    );
    expect(withoutDept.current.canSubmit).toBe(true);

    const { result: needsDept } = renderHook(() =>
      useFormComputed(VALID_UNIT, vi.fn(), ASSET_TYPES, true)
    );
    expect(needsDept.current.canSubmit).toBe(false);

    const { result: hasDept } = renderHook(() =>
      useFormComputed({ ...VALID_UNIT, departmentId: 3 }, vi.fn(), ASSET_TYPES, true)
    );
    expect(hasDept.current.canSubmit).toBe(true);
  });
});

describe('useFormComputed — pronóstico de mantenimiento', () => {
  it('shows the waiting placeholder when lastServiceDate/maintIntervalDays are missing', () => {
    const { result } = renderHook(() => useFormComputed(VALID_UNIT, vi.fn(), ASSET_TYPES, false));
    expect(result.current.isPronosticoReady).toBe(false);
    expect(result.current.pronosticoText).toContain('A la espera');
  });

  it('uses the KM/usage forecast when calculateMaintForecast returns a result', () => {
    vi.mocked(calculateMaintForecast).mockReturnValue({
      forecastDate: new Date('2026-09-01'),
      serviceByKmDate: new Date('2026-09-01'),
      serviceByTimeDate: new Date('2026-10-01'),
    } as never);
    const { result } = renderHook(() =>
      useFormComputed(
        {
          ...VALID_UNIT,
          lastServiceDate: '2026-01-01',
          maintIntervalDays: 90,
          maintIntervalKm: 10000,
          dailyUsageAvg: 40,
          odometer: 5000,
          lastServiceReading: 1000,
        },
        vi.fn(),
        ASSET_TYPES,
        false
      )
    );
    expect(result.current.isPronosticoReady).toBe(true);
    expect(result.current.pronosticoText).toContain('Uso/KM');
  });

  it('falls back to a time-only projection when calculateMaintForecast returns null', () => {
    vi.mocked(calculateMaintForecast).mockReturnValue(null as never);
    const { result } = renderHook(() =>
      useFormComputed(
        {
          ...VALID_UNIT,
          lastServiceDate: '2026-01-01',
          maintIntervalDays: 90,
          maintIntervalKm: 10000,
          dailyUsageAvg: 40,
          lastServiceReading: 1000,
        },
        vi.fn(),
        ASSET_TYPES,
        false
      )
    );
    expect(result.current.isPronosticoReady).toBe(true);
    expect(result.current.pronosticoText).toContain('Tiempo');
  });

  it('falls back to a time-only projection when usage data (km/dailyAvg) is incomplete', () => {
    const { result } = renderHook(() =>
      useFormComputed(
        { ...VALID_UNIT, lastServiceDate: '2026-01-01', maintIntervalDays: 90 },
        vi.fn(),
        ASSET_TYPES,
        false
      )
    );
    expect(calculateMaintForecast).not.toHaveBeenCalled();
    expect(result.current.isPronosticoReady).toBe(true);
    expect(result.current.pronosticoText).toContain('Tiempo');
  });
});

describe('useFormComputed — predicción ambiental (Hoy No Circula)', () => {
  it('predicts and auto-completes the hologram when placas is set and the field is empty', () => {
    const setFormData = vi.fn();
    renderHook(() =>
      useFormComputed({ ...VALID_UNIT, placas: 'ABC-123' }, setFormData, ASSET_TYPES, false)
    );
    expect(predecirHologramaYEngomado).toHaveBeenCalledWith('ABC-123', 2023, 'VEHICULO');
    expect(setFormData).toHaveBeenCalled();
  });

  it('does not overwrite an already-selected hologram', () => {
    const setFormData = vi.fn();
    renderHook(() =>
      useFormComputed(
        { ...VALID_UNIT, placas: 'ABC-123', environmentalHologram: '0' },
        setFormData,
        ASSET_TYPES,
        false
      )
    );
    expect(setFormData).not.toHaveBeenCalled();
  });

  it('clears the prediction when placas is empty', () => {
    const { result } = renderHook(() =>
      useFormComputed({ ...VALID_UNIT, placas: undefined }, vi.fn(), ASSET_TYPES, false)
    );
    expect(result.current.prediction).toBeNull();
    expect(predecirHologramaYEngomado).not.toHaveBeenCalled();
  });
});
