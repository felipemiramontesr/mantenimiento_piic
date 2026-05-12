import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, RenderResult } from '../../test/testUtils';
import FleetModule from './FleetModule';
import { UseFleetFormReturn, CatalogOption } from '../../types/fleet';
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

vi.mock('../../hooks/usePermissions', () => ({
  default: (): {
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
  } => ({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
  }),
}));

// 🔱 Mock the hook to control transitions and state
vi.mock('../../hooks/useFleetForm', () => ({
  default: vi.fn(() => ({
    formData: {
      id: '',
      assetTypeId: 1,
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      brandId: 101,
      modelId: 201,
      year: new Date().getFullYear(),
      maintenanceTimeFreqId: 1,
      maintenanceCenterId: 1,
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
    owners: [] as CatalogOption[],
    complianceStatuses: [] as CatalogOption[],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [] as string[],
    terrainTypes: [] as string[],
    colors: [] as CatalogOption[],
    maintenanceCenters: [] as CatalogOption[],
    insuranceCompanies: [] as CatalogOption[],
    routeOrigins: [] as CatalogOption[],
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
      brandId: 101,
      modelId: 201,
      year: 2024,
      maintenanceTimeFreqId: 1,
      maintenanceCenterId: 1,
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
    owners: [] as CatalogOption[],
    complianceStatuses: [] as CatalogOption[],
    setError: vi.fn(),
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    engineTypes: [] as string[],
    terrainTypes: [] as string[],
    colors: [] as CatalogOption[],
    maintenanceCenters: [] as CatalogOption[],
    insuranceCompanies: [] as CatalogOption[],
    routeOrigins: [] as CatalogOption[],
  } as unknown as UseFleetFormReturn;

  const renderModule = (): RenderResult =>
    render(
      <MemoryRouter>
        <FleetModule />
      </MemoryRouter>
    );

  it('should start in the GRID view', async (): Promise<void> => {
    vi.mocked(useFleetForm).mockReturnValue(baseMock);
    renderModule();
    expect(await screen.findByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should transition to CREATE view when starting registration', (): void => {
    vi.mocked(useFleetForm).mockReturnValue(baseMock);
    renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));
    expect(screen.getByText('IDENTIDAD')).toBeInTheDocument();
  });

  it('should return to GRID view when clicking the "Estrategia Operativa" card', async (): Promise<void> => {
    vi.mocked(useFleetForm).mockReturnValue(baseMock);
    renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));
    // Clicking the Strategy card should return to the inventory table
    fireEvent.click(screen.getByText(/Estrategia Operativa/i));
    expect(await screen.findByText('Administrar Unidades')).toBeInTheDocument();
  });

  it('should show success view after successful registration', async (): Promise<void> => {
    // 1. Setup Registration State
    vi.mocked(useFleetForm).mockReturnValue(baseMock);

    const { rerender } = renderModule();
    fireEvent.click(screen.getByText(/Iniciar Registro/i));

    // 2. Transition to Success State
    vi.mocked(useFleetForm).mockReturnValue({
      ...baseMock,
      registrationSuccess: true,
    } as unknown as UseFleetFormReturn);

    // Re-render to pick up new mock values
    rerender(
      <MemoryRouter>
        <FleetModule />
      </MemoryRouter>
    );

    expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
  });
});
