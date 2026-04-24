import { render, screen, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FleetGridView } from './FleetGridView';
import { FleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Test Suite: FleetGridView (v.17.0.2)
 * Implementation: PIIC Instrument Layout Certification
 */
describe('FleetGridView Component', () => {
  const mockProps = {
    onRegister: vi.fn((): void => {
      /* No-op */
    }),
    units: [] as FleetUnit[],
  };

  const renderComponent = (): RenderResult => render(<FleetGridView {...mockProps} />);

  it('should display the core master labels in the table header', (): void => {
    renderComponent();
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
    expect(screen.getByText('IDENTIDAD')).toBeInTheDocument();
    expect(screen.getByText('ESTRATEGIA')).toBeInTheDocument();
    expect(screen.getByText('ODOMETRÍA')).toBeInTheDocument();
    expect(screen.getByText('CONFIGURACIÓN')).toBeInTheDocument();
  });
});
