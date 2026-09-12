import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import useArchonDoctorTelemetry from './useArchonDoctorTelemetry';

/**
 * FC171 F1 — Cond.R-Doctor D2: la telemetría global (listener `window.error`
 * + polling de `__ARCHON_FLEET_CONTEXT__`) solo debe activarse cuando
 * `enabled` es `true` (i.e. `isOmegaStrict()`). Para actores no-Ω, el hook
 * debe retornar de inmediato estado inactivo, sin registrar overhead alguno.
 */
describe('useArchonDoctorTelemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario 2 — enabled=false: 0 listener de error registrado', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useArchonDoctorTelemetry(false));
    expect(addSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('Scenario 2 — enabled=false: 0 intervalo de polling registrado', () => {
    const intervalSpy = vi.spyOn(global, 'setInterval');
    renderHook(() => useArchonDoctorTelemetry(false));
    expect(intervalSpy).not.toHaveBeenCalled();
  });

  it('enabled=false retorna estado inactivo (logs vacíos, context null)', () => {
    const { result } = renderHook(() => useArchonDoctorTelemetry(false));
    expect(result.current.logs).toEqual([]);
    expect(result.current.context).toBeNull();
  });

  it('enabled=true SÍ registra el listener de error global', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useArchonDoctorTelemetry(true));
    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('enabled=true SÍ registra el intervalo de polling', () => {
    const intervalSpy = vi.spyOn(global, 'setInterval');
    renderHook(() => useArchonDoctorTelemetry(true));
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('enabled=true captura un evento de error global en logs', () => {
    const { result } = renderHook(() => useArchonDoctorTelemetry(true));
    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));
    });
    expect(result.current.logs[0].msg).toContain('boom');
  });

  it('al pasar de enabled=true a false limpia el listener previo (cleanup)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useArchonDoctorTelemetry(enabled),
      { initialProps: { enabled: true } }
    );
    rerender({ enabled: false });
    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
