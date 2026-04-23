import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import FleetRegistrationForm from './FleetRegistrationForm';
import useFleetForm from '../../hooks/useFleetForm';
import {
  UseFleetFormReturn,
  CatalogOption,
  MaintenanceFrequency,
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
      traccionId: null,
      transmisionId: null,
      fuelTypeId: null,
      marca: 'Toyota',
      marcaId: '101',
      modelo: 'Hilux',
      modeloId: '201',
      departamento: 'OPERACIONES',
      uso: 'CARGA',
      year: 2024,
      odometer: 0,
      maintenanceFrequency: 'Mensual' as MaintenanceFrequency,
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
    fuelTypes: [] as CatalogOption[],
    driveTypes: [] as CatalogOption[],
    transmissionTypes: [] as CatalogOption[],
    availableMarcas: [{ value: '101', label: 'Toyota' }] as { value: string; label: string }[],
    availableModelos: [{ value: '201', label: 'Hilux' }] as { value: string; label: string }[],
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    handleSubmit: mockSubmit,
    marcas: [] as CatalogOption[],
    modelos: [] as CatalogOption[],
    setError: vi.fn(),
    setRegistrationSuccess: vi.fn(),
    resetForm: vi.fn(),
    freqTime: [] as string[],
    freqUsage: [] as CatalogOption[],
    departments: ['OPERACIONES'] as string[],
    locations: [] as string[],
    useTypes: ['CARGA'] as string[],
    tireBrands: [] as string[],
    lubeBrands: [] as string[],
    filterBrands: [] as string[],
    engineTypes: [] as string[],
    terrainTypes: [] as string[],
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
    expect(screen.getByText('Motor de Jerarquía')).toBeInTheDocument();
    expect(screen.getByText('Identidad & Cumplimiento')).toBeInTheDocument();
  });

  it('should call onCancel when "Cancelar Registro" is clicked', (): void => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
    fireEvent.click(screen.getByText(/Anular Operación/i));
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

    fireEvent.click(screen.getByText(/Registrar en Flotilla Central/i));

    await waitFor((): void => {
      expect(mockSubmit).toHaveBeenCalled();
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });
});
