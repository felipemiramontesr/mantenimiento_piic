import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import FleetRegistrationForm from './FleetRegistrationForm';
import useFleetForm from '../../hooks/useFleetForm';
import {
  UseFleetFormReturn,
  CatalogOption,
  CentroMantenimiento,
  FleetStatus,
} from '../../types/fleet';

/**
 * 🔱 Archon Test Suite: FleetRegistrationForm
 * Logic: Production-Grade Type Parity (v.21.0.0)
 */

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
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      odometer: 0,
      maintenanceTimeFreqId: 1,
      centroMantenimiento: 'PIIC' as CentroMantenimiento,
      status: 'Disponible' as FleetStatus,
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
    (useFleetForm as Mock).mockReturnValue(mockController);
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
    (useFleetForm as Mock).mockReturnValue(submittingController);

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
});
