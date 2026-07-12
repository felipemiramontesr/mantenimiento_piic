import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArchonErrorBoundary from './ArchonErrorBoundary';

/**
 * 🔱 Archon Test Suite: ArchonErrorBoundary (FC 071 F2)
 * Terreno: sin boundary, cualquier error de render de un módulo desmontaba el
 * root COMPLETO (pantalla blanca — CI run 4 / 071_AN E3). El boundary contiene
 * el error y ofrece recuperación, nunca deja la app en blanco.
 */

const Bomb: React.FC = () => {
  throw new Error('render exploded');
};

describe('ArchonErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error to console.error — silencio esperado en test
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <ArchonErrorBoundary>
        <p>contenido sano</p>
      </ArchonErrorBoundary>
    );
    expect(screen.getByText('contenido sano')).toBeInTheDocument();
    expect(screen.queryByTestId('archon-error-boundary')).not.toBeInTheDocument();
  });

  it('catches a render error and shows the es-MX fallback instead of a blank page', () => {
    render(
      <ArchonErrorBoundary>
        <Bomb />
      </ArchonErrorBoundary>
    );
    expect(screen.getByTestId('archon-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Error Inesperado del Módulo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recargar Aplicación/i })).toBeInTheDocument();
  });

  it('reload button triggers a full page reload', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    });

    render(
      <ArchonErrorBoundary>
        <Bomb />
      </ArchonErrorBoundary>
    );
    screen.getByRole('button', { name: /Recargar Aplicación/i }).click();
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });
});
