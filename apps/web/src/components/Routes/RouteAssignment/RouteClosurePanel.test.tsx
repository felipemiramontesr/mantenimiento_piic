import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '../../../test/testUtils';
import RouteClosurePanel from './RouteClosurePanel';

describe('RouteClosurePanel (Fuel Consumption Validation)', () => {
  const defaultProps = {
    formData: {
      unitId: 'ASM-001',
      fuelLevel: 80,
      arrivalFuelLevel: 60,
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
    isEdit: true,
    isFinished: false,
    tankCapacity: 100,
  };

  it('renders correctly and displays calculated fuel consumption without load', () => {
    render(<RouteClosurePanel {...defaultProps} />);

    expect(screen.getByText(/Consumo de Ruta/i)).toBeInTheDocument();
    expect(screen.getByText(/20.0 L/i)).toBeInTheDocument();
  });

  it('calculates consumption correctly when fuel is loaded during route', () => {
    const propsWithLoad = {
      ...defaultProps,
      formData: {
        ...defaultProps.formData,
        fuelLevel: 80,
        arrivalFuelLevel: 70,
        fuelLitersLoaded: 30,
      },
    };

    render(<RouteClosurePanel {...propsWithLoad} />);

    expect(screen.getByText(/40.0 L/i)).toBeInTheDocument();
  });

  it('applies clamp safety and displays 0.0 L for impossible negative calculations', () => {
    const propsImpossible = {
      ...defaultProps,
      formData: {
        ...defaultProps.formData,
        fuelLevel: 50,
        arrivalFuelLevel: 90,
        fuelLitersLoaded: 10,
      },
    };

    render(<RouteClosurePanel {...propsImpossible} />);

    expect(screen.getByText(/0.0 L/i)).toBeInTheDocument();
  });

  it('shows warning when tank capacity is not configured', () => {
    const propsNoCapacity = {
      ...defaultProps,
      tankCapacity: 0,
    };

    render(<RouteClosurePanel {...propsNoCapacity} />);

    expect(screen.getByText(/Sin Capacidad de Tanque/i)).toBeInTheDocument();
  });
});
