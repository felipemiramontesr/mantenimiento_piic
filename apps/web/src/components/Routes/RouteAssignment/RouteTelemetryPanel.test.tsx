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
      fuelAmount: 0,
      fuelTicketImage: '',
      additivesCheck: false,
      tirePressureJson: '{}',
      checklistJson: '[]',
    },
    updateForm: vi.fn(),
    isEdit: false,
    isFinished: false,
    tankCapacity: 100,
    startReadingDisplay: '12,000',
  };

  it('renders sensor metrics correctly when a unit is assigned', () => {
    render(<RouteTelemetryPanel {...defaultProps} />);

    expect(screen.getAllByText(/75%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12,000/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Telemetría de Salida/i)).toBeInTheDocument();
  });

  it('shows disconnected state when no unit is selected', () => {
    const disconnectedProps = {
      ...defaultProps,
      formData: { ...defaultProps.formData, unitId: '' },
    };

    render(<RouteTelemetryPanel {...disconnectedProps} />);

    expect(screen.getByText(/SISTEMA DESCONECTADO/i)).toBeInTheDocument();
  });

  it('visualizes fuel volume chart with capacity data', () => {
    render(<RouteTelemetryPanel {...defaultProps} />);

    expect(screen.getByText(/Total Tanque:/i)).toBeInTheDocument();
    expect(screen.getByText(/100L/i)).toBeInTheDocument();
  });
});
