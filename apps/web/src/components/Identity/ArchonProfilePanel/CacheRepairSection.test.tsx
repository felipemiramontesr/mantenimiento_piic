import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CacheRepairSection from './CacheRepairSection';
import { archonCache } from '../../../utils/archonCache';

/**
 * FC171 F1, Cond. D3 Opción A — botón acotado de auto-reparación de caché
 * local para usuarios no-Ω, con confirmación explícita obligatoria.
 */
describe('CacheRepairSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('un solo click NO repara -- pide confirmación explícita primero', () => {
    const clearSpy = vi.spyOn(archonCache, 'clear');
    render(<CacheRepairSection />);

    fireEvent.click(screen.getByTestId('cache-repair-trigger'));

    expect(screen.getByTestId('cache-repair-confirm')).toBeInTheDocument();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('Cancelar vuelve al botón inicial sin reparar', () => {
    const clearSpy = vi.spyOn(archonCache, 'clear');
    render(<CacheRepairSection />);

    fireEvent.click(screen.getByTestId('cache-repair-trigger'));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.getByTestId('cache-repair-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('cache-repair-confirm')).toBeNull();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('confirmar llama a archonCache.clear() (no el archon_* amplio de ArchonDoctor) y recarga', () => {
    const clearSpy = vi.spyOn(archonCache, 'clear').mockImplementation(() => undefined);
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    });

    render(<CacheRepairSection />);
    fireEvent.click(screen.getByTestId('cache-repair-trigger'));
    fireEvent.click(screen.getByTestId('cache-repair-confirm-button'));

    expect(clearSpy).toHaveBeenCalledWith();
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  // Regresión FC074/I-RWD (gate permanente e2e/responsive.spec.ts): el
  // disparador quedó sin altura explícita (~20px) y rompió el gate de
  // touch-target ≥44px en las 6 celdas de /dashboard/settings. h-11 = 44px.
  it('AT-IRWD-REGR-1: el disparador "Reparar Caché Local" usa h-11 (touch-target ≥44px)', () => {
    render(<CacheRepairSection />);
    expect(screen.getByTestId('cache-repair-trigger').className).toMatch(/\bh-11\b/);
  });

  it('AT-IRWD-REGR-2: Cancelar usa h-11 explícito; "Sí, reparar" hereda h-11 de btn-sentinel-amber-static', () => {
    render(<CacheRepairSection />);
    fireEvent.click(screen.getByTestId('cache-repair-trigger'));

    expect(screen.getByText('Cancelar').className).toMatch(/\bh-11\b/);
    // btn-sentinel-amber-static define h-11 vía @apply en index.css (no se
    // repite en el className del DOM) -- se verifica la clase, no el literal.
    expect(screen.getByTestId('cache-repair-confirm-button').className).toContain(
      'btn-sentinel-amber-static'
    );
    expect(screen.getByTestId('cache-repair-confirm-button').className).not.toMatch(/h-auto/);
  });
});
