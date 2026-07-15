import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FleetRegistrationForm from './FleetRegistrationForm';
import useFleetForm from '../../hooks/useFleetForm';
import { UseFleetFormReturn, CatalogOption, FleetStatus } from '../../types/fleet';

/**
 * 🔱 Archon Test Suite: FleetRegistrationForm
 * Logic: Production-Grade Type Parity (v.21.0.0)
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('../../hooks/useFleetForm');

describe('FleetRegistrationForm Component', () => {
  const mockSubmit = vi.fn(async (_e, onSuccess) => {
    if (onSuccess) await onSuccess();
    return Promise.resolve();
  });

  const mockSetFormData = vi.fn();
  const mockResetError = vi.fn();

  const mockController = {
    formData: {
      id: 'UNIT-TEST',
      assetTypeId: 1,
      brandId: 101,
      modelId: 201,
      year: 2024,
      departmentId: 228,
      operationalUseId: 236,
      dailyUsageAvg: 30,
      lastServiceReading: 0,
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      odometer: 0,
      maintenanceTimeFreqId: 1,
      maintenanceCenterId: 1,
      status: 'Disponible' as FleetStatus,
      fuelTankCapacity: 80,
      initialFuelLevel: 100,
      lastFuelLevel: 100,
      maintIntervalDays: 90,
      maintIntervalKm: 5000,
    },
    error: null,
    resetError: mockResetError,
    setFormData: mockSetFormData,
    isSubmitting: false,
    isLoading: false,
    registrationSuccess: false,
    assetTypes: [{ id: 1, label: 'Vehiculo' }] as CatalogOption[],
    marcas: [{ id: 101, label: 'Toyota' }] as CatalogOption[],
    modelos: [{ id: 201, label: 'Hilux' }] as CatalogOption[],
    owners: [{ id: 1, label: 'Arian Silver' }] as CatalogOption[],
    complianceStatuses: [{ id: 1, label: 'Completo' }] as CatalogOption[],
    fuelTypes: [] as CatalogOption[],
    driveTypes: [] as CatalogOption[],
    transmissionTypes: [] as CatalogOption[],
    freqTime: [{ id: 1, label: 'Mensual' }] as CatalogOption[],
    freqUsage: [] as CatalogOption[],
    departments: [{ id: 228, label: 'Medio Ambiente' }] as CatalogOption[],
    locations: [] as CatalogOption[],
    useTypes: [{ id: 236, label: 'Staff' }] as CatalogOption[],
    tireBrands: [] as CatalogOption[],
    terrainTypes: [] as CatalogOption[],
    engineTypes: [] as CatalogOption[],
    lubeBrands: [] as CatalogOption[],
    filterBrands: [] as CatalogOption[],
    colors: [{ id: 1, label: 'Blanco' }] as CatalogOption[],
    maintenanceCenters: [{ id: 1, label: 'PIIC' }] as CatalogOption[],
    insuranceCompanies: [{ id: 1, label: 'AXA' }] as CatalogOption[],
    routeOrigins: [] as CatalogOption[],
    environmentalHolograms: [] as CatalogOption[],
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    handleSubmit: mockSubmit,
    setError: vi.fn(),
    setRegistrationSuccess: vi.fn(),
    resetForm: vi.fn(),
  } as unknown as UseFleetFormReturn;

  const mockProps = {
    onSuccess: vi.fn(async (): Promise<void> => Promise.resolve()),
    onCancel: vi.fn(() => {
      /* No-op */
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ ownerType: 'FLOTILLA' });
    vi.mocked(useFleetForm).mockReturnValue(mockController);
  });

  it('should render all form sections', (): void => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
    expect(screen.getByText('IDENTIDAD')).toBeInTheDocument();
    expect(screen.getByText('CUMPLIMIENTO')).toBeInTheDocument();
  });

  it('should call onCancel when "Cancelar" is clicked', (): void => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
    fireEvent.click(screen.getByText(/Cancelar/i));
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('should show "Transmitiendo..." when submitting', async (): Promise<void> => {
    const submittingController = { ...mockController, isSubmitting: true } as UseFleetFormReturn;
    vi.mocked(useFleetForm).mockReturnValue(submittingController);

    render(<FleetRegistrationForm controller={submittingController} {...mockProps} />);
    expect(screen.getByText(/Transmitiendo.../i)).toBeInTheDocument();
  });

  it('should call onSuccess and finish submission successfully', async (): Promise<void> => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);

    fireEvent.click(screen.getByText(/Confirmar Alta/i));

    await waitFor((): void => {
      expect(mockSubmit).toHaveBeenCalled();
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('PRIVATE owners do not see departmentId or accountingAccount fields', (): void => {
    mockUseAuth.mockReturnValue({ ownerType: 'PRIVATE' });
    const privateController = {
      ...mockController,
      formData: { ...mockController.formData, departmentId: null },
    } as unknown as UseFleetFormReturn;
    render(<FleetRegistrationForm controller={privateController} {...mockProps} />);
    expect(screen.queryByText(/Departamento Responsable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cuenta Contable/i)).not.toBeInTheDocument();
  });

  it('CENTER owners do not see departmentId or accountingAccount fields', (): void => {
    mockUseAuth.mockReturnValue({ ownerType: 'CENTER' });
    const centerController = {
      ...mockController,
      formData: { ...mockController.formData, departmentId: null },
    } as unknown as UseFleetFormReturn;
    render(<FleetRegistrationForm controller={centerController} {...mockProps} />);
    expect(screen.queryByText(/Departamento Responsable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cuenta Contable/i)).not.toBeInTheDocument();
  });

  // ── FC 074 F4 — Formularios_Y_Detalles_Apilables ──
  describe('AT-FC074-F4 — mobile-first form hardening', () => {
    it('AT-FC074-F4-FL-1: los contenedores 2x2 apilan a 1 columna <md (grid-cols-1 md:grid-cols-2)', (): void => {
      const { container } = render(
        <FleetRegistrationForm controller={mockController} {...mockProps} />
      );
      expect(container.innerHTML).not.toContain('"grid grid-cols-2 gap-6"');
      expect(
        container.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2.gap-6').length
      ).toBeGreaterThanOrEqual(13);
    });

    it('AT-FC074-F4-FL-2: el input de odómetro declara inputMode numeric', (): void => {
      render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
      const odometerInput = screen.getByPlaceholderText('Ej: 45000');
      expect(odometerInput).toHaveAttribute('inputmode', 'numeric');
    });

    it('AT-FC074-F4-FL-3: los inputs de costo (Seguro/Cuota Mensual) declaran inputMode decimal', (): void => {
      render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
      expect(screen.getByPlaceholderText('Ej: 850.00')).toHaveAttribute('inputmode', 'decimal');
      expect(screen.getByPlaceholderText('Ej: 15500.50')).toHaveAttribute('inputmode', 'decimal');
    });

    it('AT-FC074-F4-FL-4: la barra de acciones (Cancelar/Guardar) es sticky bottom en móvil', (): void => {
      const { container } = render(
        <FleetRegistrationForm controller={mockController} {...mockProps} />
      );
      const cancelBtn = screen.getByText(/Cancelar/i);
      const actionBar = cancelBtn.closest('.archon-grid-2-sovereign');
      expect(actionBar?.className).toMatch(/\bsticky\b/);
      expect(actionBar?.className).toMatch(/bottom-0/);
      expect(container).toBeTruthy();
    });
  });
});
