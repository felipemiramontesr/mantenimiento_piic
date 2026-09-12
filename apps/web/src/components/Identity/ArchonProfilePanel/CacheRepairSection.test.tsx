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
});
