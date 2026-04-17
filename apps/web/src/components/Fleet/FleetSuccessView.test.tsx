import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FleetSuccessView from './FleetSuccessView';
import { CreateFleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Test Suite: FleetSuccessView
 * Implementation: 100% Visual & Interaction Coverage (Pillar 2 - v.17.0.0)
 */
describe('FleetSuccessView Component', () => {
  const mockFormData: CreateFleetUnit = {
    tag: 'ASM-TEST-001',
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
    onRegisterAnother: vi.fn((): void => { /* No-op */ }),
    onManageFleet: vi.fn((): void => { /* No-op */ }),
    onGoToDashboard: vi.fn((): void => { /* No-op */ }),
  };

  const renderComponent = (): RenderResult => render(<FleetSuccessView {...mockProps} />);

  it('should render the success message with the correct asset tag', (): void => {
    renderComponent();
    expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
    expect(screen.getByText('ASM-TEST-001')).toBeInTheDocument();
  });

  it('should call onRegisterAnother when "Registrar Otra" is clicked', (): void => {
    renderComponent();
    fireEvent.click(screen.getByText('Registrar Otra'));
    expect(mockProps.onRegisterAnother).toHaveBeenCalled();
  });

  it('should call onManageFleet when "Administrar Unidades" is clicked', (): void => {
    renderComponent();
    fireEvent.click(screen.getByText('Administrar Unidades'));
    expect(mockProps.onManageFleet).toHaveBeenCalled();
  });

  it('should call onGoToDashboard when "Centro de Comando" is clicked', (): void => {
    renderComponent();
    fireEvent.click(screen.getByText('Centro de Comando'));
    expect(mockProps.onGoToDashboard).toHaveBeenCalled();
  });
});
