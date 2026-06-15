import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, RenderResult } from '../../test/testUtils';
import FleetModule, { mapUnitToFormData } from './FleetModule';
import { UseFleetFormReturn, CatalogOption, FleetUnit } from '../../types/fleet';
import useFleetForm from '../../hooks/useFleetForm';

/**
 * 🔱 Archon Test Suite: FleetModule (Orchestrator)
 * Implementation: Production-Grade Type Parity (v.21.0.0)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stableUnits: any[] = [];
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    useFleet: (): Record<string, unknown> => ({
      refreshUnits: vi.fn(async (): Promise<void> => Promise.resolve()),
      units: stableUnits,
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
    environmentalHolograms: [] as CatalogOption[],
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
    environmentalHolograms: [] as CatalogOption[],
  } as unknown as UseFleetFormReturn;

  const renderModule = (): RenderResult => render(<FleetModule />);

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
    // Clicking the header action card should return to the inventory table
    fireEvent.click(screen.getByText(/Cerrar Formulario/i));
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
    rerender(<FleetModule />);

    expect(screen.getByText('Unidad Registrada con Éxito')).toBeInTheDocument();
  });
});

describe('mapUnitToFormData — legal data parity (Fase 1 fix)', () => {
  const baseUnit: FleetUnit = {
    id: 'VEH-001',
    uuid: 'test-uuid',
    placas: null,
    numeroSerie: null,
    marca: null,
    brandId: 1,
    modelo: null,
    modelId: 1,
    images: null,
    year: 2024,
    departamento: null,
    departmentId: null,
    uso: null,
    operationalUseId: null,
    locationId: null,
    engineTypeId: null,
    colorId: null,
    motor: null,
    tireSpec: null,
    tireBrand: null,
    tireBrandId: null,
    tipoTerreno: null,
    terrainTypeId: null,
    capacidadCarga: null,
    fuelTankCapacity: null,
    odometer: 0,
    sede: null,
    centroMantenimiento: null,
    maintenanceCenterId: null,
    protocolStartDate: null,
    vigenciaSeguro: null,
    vencimientoVerificacion: null,
    lubeType: null,
    filterBrand: null,
    ownerId: null,
    complianceStatusId: null,
    accountingAccount: null,
    legalComplianceDate: null,
    insuranceExpiryDate: null,
    insurancePolicyNumber: null,
    insuranceCompanyId: null,
    insuranceCost: null,
    lastEnvironmentalVerification: null,
    lastMechanicalVerification: null,
    environmentalHologram: null,
    circulationCardNumber: null,
    monthlyLeasePayment: 0,
    status: 'ACTIVE',
    assignedOperatorId: null,
    updatedAt: '2026-01-01',
    assetTypeId: 1,
    fuelTypeId: 1,
    traccionId: 1,
    transmisionId: 1,
    lastFuelLevel: 100,
    initialFuelLevel: 100,
  };

  it('should map insurancePolicyNumber to form data', (): void => {
    const unit = { ...baseUnit, insurancePolicyNumber: 'POL-2026-001' };
    const result = mapUnitToFormData(unit);
    expect(result.insurancePolicyNumber).toBe('POL-2026-001');
  });

  it('should map lastEnvironmentalVerification normalizing ISO date', (): void => {
    const unit = { ...baseUnit, lastEnvironmentalVerification: '2026-03-15T06:00:00.000Z' };
    const result = mapUnitToFormData(unit);
    expect(result.lastEnvironmentalVerification).toBe('2026-03-15');
  });

  it('should map lastMechanicalVerification normalizing ISO date', (): void => {
    const unit = { ...baseUnit, lastMechanicalVerification: '2026-06-01T00:00:00.000Z' };
    const result = mapUnitToFormData(unit);
    expect(result.lastMechanicalVerification).toBe('2026-06-01');
  });

  it('should map description (factory specs) from unit.description — not routeDescription', (): void => {
    const unit = { ...baseUnit, description: 'Hilux Medio Ambiente' };
    const result = mapUnitToFormData(unit);
    expect(result.description).toBe('Hilux Medio Ambiente');
  });
});
