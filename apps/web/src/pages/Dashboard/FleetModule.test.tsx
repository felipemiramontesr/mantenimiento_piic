import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, RenderResult } from '../../test/testUtils';
import FleetModule, { mapUnitToFormData, daysUntil, deriveFleetAlert } from './FleetModule';
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

  // ── FC 074 F3 — Primera Oleada Adaptativa: ArchonAdaptiveView (TABLE + CARDS) en STRATEGY ──
  describe('AT-FC074-F3 — adaptive STRATEGY panel', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('AT-FC074-F3-FL-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      vi.mocked(useFleetForm).mockReturnValue(baseMock);
      renderModule();
      await screen.findByText('Administrar Unidades');
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC074-F3-FL-2: switches to CARDS view (ArchonCardView empty state, 0 units)', async () => {
      vi.mocked(useFleetForm).mockReturnValue(baseMock);
      renderModule();
      await screen.findByText('Administrar Unidades');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view-empty')).toBeInTheDocument();
      expect(localStorage.getItem('archon_adaptive_view_fleet-strategy')).toBe('CARDS');
    });
  });

  // ── FC 078 F2(b) — receta v2 de tarjeta: odómetro/sede + alerta activa ──
  describe('AT-FC078-F2b — renderFleetCard receta v2', () => {
    const cardUnit: FleetUnit = {
      id: 'VEH-777',
      uuid: 'test-uuid-777',
      placas: 'ABC-1234',
      numeroSerie: null,
      marca: 'Kenworth',
      brandId: 1,
      modelo: 'T680',
      modelId: 1,
      images: null,
      year: 2024,
      departamento: 'Operaciones',
      departmentId: 1,
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
      odometer: 123456,
      sede: 'Monterrey',
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

    afterEach(() => {
      stableUnits.length = 0;
    });

    it('AT-FC078-F2b-FL-1: card shows odómetro and sede metric rows', async () => {
      vi.mocked(useFleetForm).mockReturnValue(baseMock);
      stableUnits.push(cardUnit);
      renderModule();
      await screen.findByText('Administrar Unidades');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByText('123,456 km')).toBeInTheDocument();
      expect(screen.getByText('Monterrey')).toBeInTheDocument();
    });

    it('AT-FC078-F2b-FL-2: no alert badge when vencimientoVerificacion is far in the future', async () => {
      vi.mocked(useFleetForm).mockReturnValue(baseMock);
      stableUnits.push({ ...cardUnit, vencimientoVerificacion: '2099-01-01' });
      renderModule();
      await screen.findByText('Administrar Unidades');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByText('123,456 km');
      expect(screen.queryByTestId('card-alert-badge')).not.toBeInTheDocument();
    });

    it('AT-FC078-F2b-FL-3: shows critical alert badge when vencimientoVerificacion is past', async () => {
      vi.mocked(useFleetForm).mockReturnValue(baseMock);
      stableUnits.push({ ...cardUnit, vencimientoVerificacion: '2000-01-01' });
      renderModule();
      await screen.findByText('Administrar Unidades');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      const badge = await screen.findByTestId('card-alert-badge');
      expect(badge).toHaveTextContent('Verificación vencida');
    });
  });
});

describe('daysUntil / deriveFleetAlert (FC 078 F2b — pure logic)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('daysUntil returns null for null/invalid input', () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil('not-a-date')).toBeNull();
  });

  it('daysUntil computes positive days for a future date', () => {
    expect(daysUntil('2026-07-27T12:00:00.000Z')).toBe(10);
  });

  it('deriveFleetAlert returns null when no vencimientoVerificacion', () => {
    expect(deriveFleetAlert({ vencimientoVerificacion: null } as FleetUnit)).toBeNull();
  });

  it('deriveFleetAlert returns null when far in the future (>30 days)', () => {
    expect(deriveFleetAlert({ vencimientoVerificacion: '2099-01-01' } as FleetUnit)).toBeNull();
  });

  it('deriveFleetAlert returns warning when due within 30 days', () => {
    const result = deriveFleetAlert({
      vencimientoVerificacion: '2026-07-25T12:00:00.000Z',
    } as FleetUnit);
    expect(result?.tone).toBe('warning');
  });

  it('deriveFleetAlert returns critical when already past', () => {
    const result = deriveFleetAlert({ vencimientoVerificacion: '2026-01-01' } as FleetUnit);
    expect(result?.tone).toBe('critical');
    expect(result?.label).toBe('Verificación vencida');
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
