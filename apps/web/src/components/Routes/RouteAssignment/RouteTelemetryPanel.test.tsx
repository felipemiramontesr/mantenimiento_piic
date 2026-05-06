import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '../../../test/testUtils';
import RouteTelemetryPanel from './RouteTelemetryPanel';

describe('RouteTelemetryPanel (Sensor Validation)', () => {
  const defaultProps = {
    formData: {
      unitId: 'ASM-001',
      fuelLevel: 75,
      startReading: 12000,
      operatorId: '1',
      origin: 'Base',
      destination: 'Mina',
      description: '',
      endReading: 0,
      fuelLitersLoaded: 0,
      fuelTicketImage: '',
    },
    updateForm: vi.fn(),
    isEdit: false,
    isFinished: false,
    tankCapacity: 100,
    startReadingDisplay: '12,000',
  };

  it('renders sensor metrics correctly when a unit is assigned', () => {
    render(<RouteTelemetryPanel {...defaultProps} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('12,000')).toBeInTheDocument();
    expect(screen.getByText(/Telemetría de Salida/i)).toBeInTheDocument();
  });

  it('shows disconnected state when no unit is selected', () => {
    const disconnectedProps = {
      ...defaultProps,
      formData: { ...defaultProps.formData, unitId: '' },
    };

    render(<RouteTelemetryPanel {...disconnectedProps} />);

    expect(screen.getByText(/SISTEMA DESCONECTADO/i)).toBeInTheDocument();
    expect(screen.getByText(/SELECCIONE UNA UNIDAD PARA ACTIVAR PARAMETRÍA/i)).toBeInTheDocument();
  });

  it('visualizes fuel volume chart with capacity data', () => {
    render(<RouteTelemetryPanel {...defaultProps} />);

    // Check if FuelVolumeChart logic is active (implied by capacity > 0)
    expect(screen.getByText(/Capacidad Total/i)).toBeInTheDocument();
    expect(screen.getByText(/100 L/i)).toBeInTheDocument();
  });
});
