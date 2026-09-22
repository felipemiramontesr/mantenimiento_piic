import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CapabilityRoute from './CapabilityRoute';
import useCapabilities from '../../hooks/useCapabilities';

/**
 * FC193 F3 — guard de ruta por capacidad: activo ⇒ renderiza el módulo; inactivo ⇒ rebota a
 * /dashboard llevando `state.capabilityNotice` (Scenario 2: URL directa a un módulo no instalado).
 */

vi.mock('../../hooks/useCapabilities', () => ({ default: vi.fn() }));

const capabilities = vi.mocked(useCapabilities);

const givenActive = (...active: string[]): void => {
  capabilities.mockReturnValue({
    isSuperclusterActive: (code) => active.includes(code),
    isClusterActive: () => true,
  });
};

/** Destino del rebote: expone el `state` recibido. */
const Comando = (): React.JSX.Element => {
  const location = useLocation();
  return <div data-testid="comando">{JSON.stringify(location.state)}</div>;
};

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<Comando />} />
        <Route
          path="/dashboard/maintenance"
          element={
            <CapabilityRoute supercluster="MANTENIMIENTO">
              <div data-testid="modulo">Mantenimiento</div>
            </CapabilityRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('CapabilityRoute (FC193 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Supercúmulo activo ⇒ renderiza el módulo', () => {
    givenActive('MANTENIMIENTO');

    renderAt('/dashboard/maintenance');

    expect(screen.getByTestId('modulo')).toBeInTheDocument();
    expect(screen.queryByTestId('comando')).not.toBeInTheDocument();
  });

  it('Supercúmulo inactivo ⇒ rebota a /dashboard con el aviso en el estado de navegación', () => {
    givenActive('RASTREO');

    renderAt('/dashboard/maintenance');

    expect(screen.queryByTestId('modulo')).not.toBeInTheDocument();
    expect(screen.getByTestId('comando')).toHaveTextContent('{"capabilityNotice":"MANTENIMIENTO"}');
  });
});
