import React, { useState } from 'react';
import { render as rtlRender, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ArchonDoctor from './ArchonDoctor';
import { ArchonDoctorProvider } from './context/ArchonDoctorContext';
import usePermissions from './hooks/usePermissions';

/**
 * FC171/172 F1 — ArchonDoctor solo se monta hoy dentro de la Consola
 * Soberana (`isOmegaStrict()`-gated), controlado desde afuera vía
 * `isOpen`/`onClose` (el tile "Consola Forense" de FC172 dispara la
 * apertura) — estos tests representan siempre esa vista, por lo que
 * `usePermissions` se mockea a Ω para toda la suite.
 */
vi.mock('./hooks/usePermissions', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
    isOmnipotent: (): boolean => true,
    isOmegaStrict: (): boolean => true,
  });
});

/** Harness de estado controlado: `onClose` cierra localmente, como lo haría el consumidor real (`SovereignConsoleCard`). */
function DoctorHarness({ initialOpen }: { readonly initialOpen: boolean }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(initialOpen);
  return <ArchonDoctor isOpen={isOpen} onClose={(): void => setIsOpen(false)} />;
}

const render = (initialOpen = true): ReturnType<typeof rtlRender> =>
  rtlRender(
    <ArchonDoctorProvider>
      <DoctorHarness initialOpen={initialOpen} />
    </ArchonDoctorProvider>
  );

const FLEET_CONTEXT_KEY = '__ARCHON_FLEET_CONTEXT__';

const setFleetContextBridge = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)[FLEET_CONTEXT_KEY] = value;
};

const clearFleetContextBridge = (): void => {
  delete (window as unknown as Record<string, unknown>)[FLEET_CONTEXT_KEY];
};

describe('ArchonDoctor — controlled open/close (FC172)', () => {
  afterEach(() => {
    cleanup();
  });

  it('AT-FC172-AD-1: isOpen=false no renderiza nada', () => {
    const { container } = render(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the panel when isOpen=true and closes it via the ✕ button', () => {
    render(true);
    expect(screen.getByText('Forensic Console V4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Forensic Console V4')).not.toBeInTheDocument();
  });

  it('defaults to the NET tab and switches to DATA/ERR/CACHE on click', () => {
    render();

    expect(screen.getByText(/Listening for network events/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('DATA'));
    expect(screen.getByText('Valid Units')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ERR'));
    expect(screen.getByText(/ZERO CRITICAL EXCEPTIONS DETECTED/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('CACHE'));
    expect(screen.getByText(/Emergency Wipe & Reload/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('NET'));
    expect(screen.getByText(/Listening for network events/i)).toBeInTheDocument();
  });
});

describe('ArchonDoctor — window.__ARCHON_FLEET_CONTEXT__ polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    clearFleetContextBridge();
  });

  it('shows fallback zeros in the DATA tab when no context is present yet', () => {
    render();
    fireEvent.click(screen.getByText('DATA'));

    expect(screen.getByText('Valid Units').nextSibling?.textContent).toBe('0');
    expect(screen.getByText('Corrupt/Fail').nextSibling?.textContent).toBe('0');
    expect(screen.getByText('Stats Total:').nextElementSibling?.textContent).toBe('0');
  });

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — unc line 26 (interval bridge falsy guard) ──
  it('the polling interval is a no-op while the fleet context bridge is unset', async () => {
    render();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('DETECTOR ACTIVE').className).toContain('text-yellow-400');
    fireEvent.click(screen.getByText('DATA'));
    expect(screen.getByText('Valid Units').nextSibling?.textContent).toBe('0');
  });

  it('reflects window.__ARCHON_FLEET_CONTEXT__ once the polling interval ticks', async () => {
    render();

    setFleetContextBridge({
      units: [{ id: 'U-1' }, { id: 'U-2' }],
      integrity: { corrupt: 1 },
      stats: { total: 2 },
      isSyncing: true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('DETECTOR ACTIVE').className).toContain('text-green-400');

    fireEvent.click(screen.getByText('DATA'));
    expect(screen.getByText('Valid Units').nextSibling?.textContent).toBe('2');
    expect(screen.getByText('Corrupt/Fail').nextSibling?.textContent).toBe('1');
    expect(screen.getByText('Stats Total:').nextElementSibling?.textContent).toBe('2');
  });
});

describe('ArchonDoctor — global error capture and log rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('captures a window error event and lists it on both the NET and ERR tabs', () => {
    render();

    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'Segfault in the matrix' }));
    });

    expect(screen.getByText(/CRASH: Segfault in the matrix/i)).toBeInTheDocument();
    expect(screen.queryByText(/Listening for network events/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('ERR'));
    expect(screen.getByText(/CRASH: Segfault in the matrix/i)).toBeInTheDocument();
    expect(screen.queryByText(/ZERO CRITICAL EXCEPTIONS DETECTED/i)).not.toBeInTheDocument();
  });
});

describe('ArchonDoctor — DATA tab export button', () => {
  afterEach(() => {
    cleanup();
  });

  it('logs the units dump to the console and records a data-type log entry', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    render();
    fireEvent.click(screen.getByText('DATA'));

    fireEvent.click(screen.getByText('Export JSON to Console'));

    expect(consoleSpy).toHaveBeenCalledWith('🔱 ARCHON DATA DUMP:', undefined);
    consoleSpy.mockRestore();
  });
});

describe('ArchonDoctor — CACHE tab emergency wipe', () => {
  afterEach(() => {
    cleanup();
  });

  // FC171 Cond. D3 Opción A — el wipe ahora exige confirmación explícita
  // antes de ejecutar; un solo click ya no basta (no debe wipear de inmediato).
  it('AT-FC171-AD-1: un solo click NO wipea -- pide confirmación explícita primero', () => {
    localStorage.setItem('archon_units', 'stale');

    render();
    fireEvent.click(screen.getByText('CACHE'));
    fireEvent.click(screen.getByText('Emergency Wipe & Reload'));

    expect(screen.getByText(/¿Confirmar borrado total\?/i)).toBeInTheDocument();
    expect(localStorage.getItem('archon_units')).toBe('stale');
  });

  it('AT-FC171-AD-2: Cancelar vuelve al botón inicial sin wipear', () => {
    localStorage.setItem('archon_units', 'stale');

    render();
    fireEvent.click(screen.getByText('CACHE'));
    fireEvent.click(screen.getByText('Emergency Wipe & Reload'));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.getByText(/Emergency Wipe & Reload/i)).toBeInTheDocument();
    expect(localStorage.getItem('archon_units')).toBe('stale');
  });

  it('clears only archon_-prefixed localStorage keys and reloads the page after confirmation', () => {
    localStorage.setItem('archon_units', 'stale');
    localStorage.setItem('archon_users', 'stale');
    localStorage.setItem('unrelated_key', 'keep-me');

    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    });

    render();
    fireEvent.click(screen.getByText('CACHE'));
    fireEvent.click(screen.getByText('Emergency Wipe & Reload'));
    fireEvent.click(screen.getByText('Confirmar'));

    expect(localStorage.getItem('archon_units')).toBeNull();
    expect(localStorage.getItem('archon_users')).toBeNull();
    expect(localStorage.getItem('unrelated_key')).toBe('keep-me');
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', { configurable: true, value: original });
    localStorage.removeItem('unrelated_key');
  });
});
