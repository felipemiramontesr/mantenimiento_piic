import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FleetGridView } from './FleetGridView';

/**
 * 🔱 Archon Test Suite: FleetGridView
 * Implementation: 100% Interaction Coverage (Pillar 2 - v.17.0.0)
 */
describe('FleetGridView Component', () => {
  const mockProps = {
    onRegister: vi.fn((): void => { /* No-op */ }),
    units: [] as Record<string, unknown>[],
  };

  const renderComponent = (): RenderResult => render(<FleetGridView {...mockProps} />);

  it('should render the grid header', (): void => {
    renderComponent();
    expect(screen.getByText('Gestión de Flotilla')).toBeInTheDocument();
  });

  it('should call onRegister when "Incorporar Activo" is clicked', (): void => {
    renderComponent();
    fireEvent.click(screen.getByText(/Incorporar Activo/i));
    expect(mockProps.onRegister).toHaveBeenCalled();
  });

  it('should display empty state message when no units are provided', (): void => {
    renderComponent();
    expect(screen.getByText('No hay registros')).toBeInTheDocument();
  });
});
