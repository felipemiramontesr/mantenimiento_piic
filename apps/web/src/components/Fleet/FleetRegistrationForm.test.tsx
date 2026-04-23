import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import FleetRegistrationForm from './FleetRegistrationForm';
import useFleetForm from '../../hooks/useFleetForm';

// 🔱 Mock the hook to control state and bypass initial empty-state validation in tests
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
      marca: 'Toyota',
      marcaId: '101',
      modelo: 'Hilux',
      modeloId: '201',
      departamento: 'OPERACIONES',
      uso: 'CARGA',
      year: 2024,
      odometer: 0,
      maintenanceFrequency: 'Mensual',
      centroMantenimiento: 'PIIC',
      status: 'Disponible',
    },
    error: null,
    resetError: mockResetError,
    setFormData: mockSetFormData,
    isSubmitting: false,
    isLoading: false,
    registrationSuccess: false,
    assetTypes: [{ id: 1, label: 'Vehiculo' }],
    fuelTypes: [],
    driveTypes: [],
    transmissionTypes: [],
    availableMarcas: [{ value: '101', label: 'Toyota' }],
    availableModelos: [{ value: '201', label: 'Hilux' }],
    handleAssetTypeChange: vi.fn(),
    handleMarcaChange: vi.fn(),
    handleModeloChange: vi.fn(),
    handleSubmit: mockSubmit,
    freqTime: [],
    freqUsage: [],
    departments: ['OPERACIONES'],
    locations: [],
    useTypes: ['CARGA'],
    tireBrands: [],
    lubeBrands: [],
    filterBrands: [],
    engineTypes: [],
    terrainTypes: [],
  };

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
    expect(screen.getByText('Clasificación del Activo')).toBeInTheDocument();
    expect(screen.getByText('Identidad del Activo')).toBeInTheDocument();
  });

  it('should call onCancel when "Cancelar Registro" is clicked', (): void => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);
    fireEvent.click(screen.getByText('Cancelar Registro'));
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('should show "Transmitiendo..." when submitting', async (): Promise<void> => {
    const submittingController = { ...mockController, isSubmitting: true };
    (useFleetForm as Mock).mockReturnValue(submittingController);

    render(<FleetRegistrationForm controller={submittingController} {...mockProps} />);
    expect(screen.getByText(/Transmitiendo.../i)).toBeInTheDocument();
  });

  it('should call onSuccess and finish submission successfully', async (): Promise<void> => {
    render(<FleetRegistrationForm controller={mockController} {...mockProps} />);

    fireEvent.click(screen.getByText(/Confirmar Registro/i));

    await waitFor((): void => {
      expect(mockSubmit).toHaveBeenCalled();
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });
});
