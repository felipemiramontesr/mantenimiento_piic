import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArchonDoctor } from './ArchonDoctor';

/**
 * FC 074 F2 — Navegación Soberana Móvil.
 * Cobertura mínima y acotada al hallazgo de F1 (074_AN): el badge
 * "ARCHON DOCTOR" medía 213×30 (altura <44px) en las 54 celdas auditadas.
 * No amplía cobertura del resto del componente (fuera de scope de FC 074).
 */
describe('ArchonDoctor — FC 074 F2 touch-target', () => {
  it('AT-FC074-F2-AD-1: el badge cerrado usa min-h-11 (44px) en vez de py-2 (~30px)', () => {
    render(<ArchonDoctor />);
    const badge = screen.getByRole('button', { name: /ARCHON DOCTOR/i });
    expect(badge.className).toMatch(/\bmin-h-11\b/);
  });
});

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — the panel open/close,
 * tab navigation, the window.__ARCHON_FLEET_CONTEXT__ polling bridge, the
 * global error listener, log rendering (empty + populated), the JSON export
 * button and the CACHE wipe button never had direct coverage — the only
 * pre-existing test only ever renders the closed badge.
 */
const openPanel = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /ARCHON DOCTOR/i }));
};

const FLEET_CONTEXT_KEY = '__ARCHON_FLEET_CONTEXT__';

const setFleetContextBridge = (value: unknown): void => {
  (window as unknown as Record<string, unknown>)[FLEET_CONTEXT_KEY] = value;
};

const clearFleetContextBridge = (): void => {
  delete (window as unknown as Record<string, unknown>)[FLEET_CONTEXT_KEY];
};

describe('ArchonDoctor — panel open/close and tab navigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens the panel on badge click and closes it via the ✕ button', () => {
    render(<ArchonDoctor />);
    openPanel();
    expect(screen.getByText('Forensic Console V4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Forensic Console V4')).not.toBeInTheDocument();
  });

  it('defaults to the NET tab and switches to DATA/ERR/CACHE on click', () => {
    render(<ArchonDoctor />);
    openPanel();

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
    render(<ArchonDoctor />);
    openPanel();
    fireEvent.click(screen.getByText('DATA'));

    expect(screen.getByText('Valid Units').nextSibling?.textContent).toBe('0');
    expect(screen.getByText('Corrupt/Fail').nextSibling?.textContent).toBe('0');
    expect(screen.getByText('Stats Total:').nextElementSibling?.textContent).toBe('0');
  });

  it('reflects window.__ARCHON_FLEET_CONTEXT__ once the polling interval ticks', async () => {
    render(<ArchonDoctor />);
    openPanel();

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
    render(<ArchonDoctor />);
    openPanel();

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
    render(<ArchonDoctor />);
    openPanel();
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

  it('clears only archon_-prefixed localStorage keys and reloads the page', () => {
    localStorage.setItem('archon_units', 'stale');
    localStorage.setItem('archon_users', 'stale');
    localStorage.setItem('unrelated_key', 'keep-me');

    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    });

    render(<ArchonDoctor />);
    openPanel();
    fireEvent.click(screen.getByText('CACHE'));
    fireEvent.click(screen.getByText('Emergency Wipe & Reload'));

    expect(localStorage.getItem('archon_units')).toBeNull();
    expect(localStorage.getItem('archon_users')).toBeNull();
    expect(localStorage.getItem('unrelated_key')).toBe('keep-me');
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', { configurable: true, value: original });
    localStorage.removeItem('unrelated_key');
  });
});
