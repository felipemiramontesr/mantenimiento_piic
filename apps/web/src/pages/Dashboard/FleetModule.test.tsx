import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FleetModule from './FleetModule';
import { FleetProvider } from '../../context/FleetContext';

/**
 * 🔱 Archon Test Suite: FleetModule (Orchestrator)
 * Implementation: 100% Path Coverage (Pillar 2 - v.17.0.0)
 */

import { UserProvider } from '../../context/UserContext';

import useFleetForm from '../../hooks/useFleetForm';

// Mock specialized context
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    useFleet: (): Record<string, unknown> => ({
      refreshUnits: vi.fn(async (): Promise<void> => Promise.resolve()),
      units: [],
      loading: false,
    }),
  };
});

// 🔱 Mock the hook to control transitions and state
vi.mock('../../hooks/useFleetForm', () => ({
  default: vi.fn(() => ({
    formData: { id: '' },
    registrationSuccess: false,
    setRegistrationSuccess: vi.fn(),
    isLoading: false,
    error: null,
    resetError: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    assetTypes: [],
    fuelTypes: [],
    driveTypes: [],
    transmissionTypes: [],
    availableMarcas: [],
    availableModelos: [],
    freqTime: [],
    freqUsage: [],
    departments: [],
    locations: [],
    useTypes: [],
    tireBrands: [],
    lubeBrands: [],
    filterBrands: [],
    marcas: [],
    modelos: [],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [],
    terrainTypes: [],
  })),
}));

describe('FleetModule Orchestrator', () => {
  const baseMock = {
    formData: { id: 'UNIT-TEST' },
    registrationSuccess: false,
    setRegistrationSuccess: vi.fn(),
    isLoading: false,
    error: null,
    resetError: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    assetTypes: [],
    fuelTypes: [],
    driveTypes: [],
    transmissionTypes: [],
    availableMarcas: [],
    availableModelos: [],
    freqTime: [],
    freqUsage: [],
    departments: [],
    locations: [],
    useTypes: [],
    tireBrands: [],
    lubeBrands: [],
    filterBrands: [],
    marcas: [],
    modelos: [],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [],
    terrainTypes: [],
  };

  const renderModule = (): RenderResult =>
    render(
      <MemoryRouter>
        <UserProvider>
          <FleetProvider>
            <FleetModule />
          </FleetProvider>
        </UserProvider>
      </MemoryRouter>
    );

  it('should start in the GRID view', (): void => {
    (useFleetForm as Mock).mockReturnValue(baseMock);
    renderModule();
    expect(screen.getByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should transition to CREATE view when starting registration', (): void => {
    (useFleetForm as Mock).mockReturnValue(baseMock);
    renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));
    expect(screen.getByText('Identidad del Activo')).toBeInTheDocument();
  });

  it('should return to GRID view when clicking the "Estrategia Operativa" card', (): void => {
    (useFleetForm as Mock).mockReturnValue(baseMock);
    renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));
    // Clicking the Strategy card should return to the inventory table
    fireEvent.click(screen.getByText(/Estrategia Operativa/i));
    expect(screen.getByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should show success view after successful registration', async (): Promise<void> => {
    // 1. Setup Registration State
    (useFleetForm as Mock).mockReturnValue(baseMock);

    const { rerender } = renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));

    // 2. Transition to Success State
    (useFleetForm as Mock).mockReturnValue({
      ...baseMock,
      registrationSuccess: true,
    });

    // Re-render to pick up new mock values
    rerender(
      <MemoryRouter>
        <UserProvider>
          <FleetProvider>
            <FleetModule />
          </FleetProvider>
        </UserProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
  });

  it('should toggle user menu correctly', (): void => {
    renderModule();
    const menuButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
    expect(screen.getByText('Desconexión')).toBeInTheDocument();
  });

  it('should logout correctly', (): void => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    renderModule();
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByText('Desconexión'));
    expect(removeItemSpy).toHaveBeenCalledWith('archon_token');
  });
});
