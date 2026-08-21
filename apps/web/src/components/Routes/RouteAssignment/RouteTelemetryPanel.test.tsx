import { describe, it, expect, vi } from 'vitest';
import { screen, render, fireEvent } from '../../../test/testUtils';
import RouteTelemetryPanel from './RouteTelemetryPanel';

describe('RouteTelemetryPanel (Sensor Validation)', () => {
  const defaultProps = {
    formData: {
      unitId: 'ASM-001',
      fuelLevel: 75,
      arrivalFuelLevel: 75,
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

  // ── R4-C Fc162 — Sonar unc lines 91,117,136,171-181,202-205 ──
  it('isEdit=false: actualiza startReading, el selector de litros (vacío y con valor) y el sensor de combustible', () => {
    const updateForm = vi.fn();
    const { container } = render(<RouteTelemetryPanel {...defaultProps} updateForm={updateForm} />);

    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs).toHaveLength(2); // [startReading (odómetro), litros]

    fireEvent.change(numberInputs[0], { target: { value: '15000' } });
    expect(updateForm).toHaveBeenCalledWith({ startReading: 15000 });

    fireEvent.change(numberInputs[1], { target: { value: '' } });
    expect(updateForm).toHaveBeenCalledWith({ fuelLevel: 0 });

    fireEvent.change(numberInputs[1], { target: { value: '50' } });
    expect(updateForm).toHaveBeenCalledWith({ fuelLevel: 50 });

    fireEvent.click(screen.getByTitle('F (100%)'));
    expect(updateForm).toHaveBeenCalledWith({ fuelLevel: 100 });
  });

  it('isEdit=true: actualiza SALIDA/LLEGADA, el selector de litros y el sensor via arrivalFuelLevel', () => {
    const updateForm = vi.fn();
    const { container } = render(
      <RouteTelemetryPanel {...defaultProps} updateForm={updateForm} isEdit />
    );

    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs).toHaveLength(3); // [SALIDA, LLEGADA, litros]

    fireEvent.change(numberInputs[0], { target: { value: '13000' } });
    expect(updateForm).toHaveBeenCalledWith({ startReading: 13000 });

    fireEvent.change(numberInputs[1], { target: { value: '13500' } });
    expect(updateForm).toHaveBeenCalledWith({ endReading: 13500 });

    fireEvent.change(numberInputs[2], { target: { value: '30' } });
    expect(updateForm).toHaveBeenCalledWith({ arrivalFuelLevel: 30 });

    fireEvent.click(screen.getByTitle('E (0%)'));
    expect(updateForm).toHaveBeenCalledWith({ arrivalFuelLevel: 0 });
  });
});
