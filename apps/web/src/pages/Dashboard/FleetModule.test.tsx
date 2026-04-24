import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FleetModule from './FleetModule';
import { FleetProvider } from '../../context/FleetContext';
import { UserProvider } from '../../context/UserContext';
import { UseFleetFormReturn, CatalogOption, CentroMantenimiento } from '../../types/fleet';
import useFleetForm from '../../hooks/useFleetForm';

/**
 * 🔱 Archon Test Suite: FleetModule (Orchestrator)
 * Implementation: Production-Grade Type Parity (v.21.0.0)
 */

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
    formData: {
      id: '',
      assetTypeId: 1,
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      marca: '',
      modelo: '',
      year: new Date().getFullYear(),
      maintenanceTimeFreqId: 1,
      centroMantenimiento: 'PIIC' as CentroMantenimiento,
    },
    registrationSuccess: false,
    setRegistrationSuccess: vi.fn(),
    isLoading: false,
    error: null,
    resetError: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    assetTypes: [] as CatalogOption[],
    fuelTypes: [] as CatalogOption[],
    driveTypes: [] as CatalogOption[],
    transmissionTypes: [] as CatalogOption[],
    availableMarcas: [] as { value: string; label: string }[],
    availableModelos: [] as { value: string; label: string }[],
    freqTime: [{ id: 1, label: 'Mensual' }] as CatalogOption[],
    freqUsage: [] as CatalogOption[],
    departments: [] as string[],
    locations: [] as string[],
    useTypes: [] as string[],
    tireBrands: [] as string[],
    lubeBrands: [] as string[],
    filterBrands: [] as string[],
    marcas: [] as CatalogOption[],
    modelos: [] as CatalogOption[],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [] as string[],
    terrainTypes: [] as string[],
  })),
}));

describe('FleetModule Orchestrator', () => {
  const baseMock = {
    formData: {
      id: 'UNIT-TEST',
      assetTypeId: 1,
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      marca: 'Toyota',
      modelo: 'Hilux',
      year: 2024,
      maintenanceTimeFreqId: 1,
      centroMantenimiento: 'PIIC' as CentroMantenimiento,
    },
    registrationSuccess: false,
    setRegistrationSuccess: vi.fn(),
    isLoading: false,
    error: null,
    resetError: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    assetTypes: [] as CatalogOption[],
    fuelTypes: [] as CatalogOption[],
    driveTypes: [] as CatalogOption[],
    transmissionTypes: [] as CatalogOption[],
    availableMarcas: [] as { value: string; label: string }[],
    availableModelos: [] as { value: string; label: string }[],
    freqTime: [{ id: 1, label: 'Mensual' }] as CatalogOption[],
    freqUsage: [] as CatalogOption[],
    departments: [] as string[],
    locations: [] as string[],
    useTypes: [] as string[],
    tireBrands: [] as string[],
    lubeBrands: [] as string[],
    filterBrands: [] as string[],
    marcas: [] as CatalogOption[],
    modelos: [] as CatalogOption[],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [] as string[],
    terrainTypes: [] as string[],
  } as unknown as UseFleetFormReturn;

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
    expect(screen.getByText('Motor de Jerarquía')).toBeInTheDocument();
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
    } as unknown as UseFleetFormReturn);

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
    (useFleetForm as Mock).mockReturnValue(baseMock);
    renderModule();
    const menuButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(menuButton);
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
    expect(screen.getByText('Desconexión')).toBeInTheDocument();
  });

  it('should logout correctly', (): void => {
    (useFleetForm as Mock).mockReturnValue(baseMock);
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    renderModule();
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByText('Desconexión'));
    expect(removeItemSpy).toHaveBeenCalledWith('archon_token');
  });
});
