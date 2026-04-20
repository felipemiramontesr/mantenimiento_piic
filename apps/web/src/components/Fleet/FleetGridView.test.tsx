import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
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

  it('should call onRegister when "Registrar" button is clicked', (): void => {
    renderComponent();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));
    expect(mockProps.onRegister).toHaveBeenCalled();
  });

  it('should display the core master labels', (): void => {
    renderComponent();
    expect(screen.getByText('Administración')).toBeInTheDocument();
    expect(screen.getByText('Registrar')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
  });
});
