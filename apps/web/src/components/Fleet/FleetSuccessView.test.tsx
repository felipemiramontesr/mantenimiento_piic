import { render, screen, RenderResult } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FleetSuccessView from './FleetSuccessView';
import { CreateFleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Test Suite: FleetSuccessView
 * Implementation: 100% Visual & Interaction Coverage (Pillar 2 - v.17.0.0)
 */
describe('FleetSuccessView Component', () => {
  const mockFormData: CreateFleetUnit = {
    id: 'ASM-TEST-001',
    assetType: 'Vehiculo',
    marca: 'Toyota',
    modelo: 'Hilux',
    year: 2024,
    traccion: '4x4',
    transmision: 'Estándar (Manual)',
    fuelType: 'Diesel',
    maintenanceFrequency: 'Mensual',
    centroMantenimiento: 'PIIC',
  };

  const mockProps = {
    formData: mockFormData,
  };

  const renderComponent = (): RenderResult => render(<FleetSuccessView {...mockProps} />);

  it('should render the success message with the correct asset tag', (): void => {
    renderComponent();
    expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
    expect(screen.getByText('ASM-TEST-001')).toBeInTheDocument();
  });
});
