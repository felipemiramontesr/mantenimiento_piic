import { describe, it, expect, vi } from 'vitest';
import { screen, render, fireEvent } from '../../../test/testUtils';
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

  // ── R4-C Fc162 — Sonar unc lines 33,40-44,47,51-52,92-93,135-136,154,171,196,216 ──
  it('AT-RCP-TIRECATCH-1: tirePressureJson malformado cae al catch (tireData = {})', () => {
    render(
      <RouteClosurePanel
        {...defaultProps}
        formData={{ ...defaultProps.formData, tirePressureJson: 'not-json' }}
      />
    );
    const psiInputs = screen.getAllByPlaceholderText('--');
    expect(psiInputs).toHaveLength(4);
    psiInputs.forEach((input) => expect(input).toHaveValue(''));
  });

  it('AT-RCP-TIRE-1: escribir en un input de presión de neumático invoca updateTire → updateForm', () => {
    const updateForm = vi.fn();
    render(<RouteClosurePanel {...defaultProps} updateForm={updateForm} />);

    const [diInput] = screen.getAllByPlaceholderText('--');
    fireEvent.change(diInput, { target: { value: '35' } });
    expect(updateForm).toHaveBeenCalledWith({ tirePressureJson: JSON.stringify({ DI: '35' }) });
  });

  it('AT-RCP-FUEL-1: escribir en "Litros Cargados"/"Monto del Ticket" filtra caracteres no numéricos', () => {
    const updateForm = vi.fn();
    render(<RouteClosurePanel {...defaultProps} updateForm={updateForm} />);

    const [litersInput, amountInput] = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(litersInput, { target: { value: '12.5abc' } });
    expect(updateForm).toHaveBeenCalledWith({ fuelLitersLoaded: '12.5' });

    fireEvent.change(amountInput, { target: { value: '99xyz.9' } });
    expect(updateForm).toHaveBeenCalledWith({ fuelAmount: '99.9' });
  });

  it('AT-RCP-CHECK-1: el checkbox de aditivos invoca updateForm con el nuevo estado', () => {
    const updateForm = vi.fn();
    render(<RouteClosurePanel {...defaultProps} updateForm={updateForm} />);

    fireEvent.click(screen.getByLabelText('¿Se aplicaron Aditivos?'));
    expect(updateForm).toHaveBeenCalledWith({ additivesCheck: true });
  });

  it('AT-RCP-OBS-1: escribir en Observaciones invoca updateForm', () => {
    const updateForm = vi.fn();
    render(<RouteClosurePanel {...defaultProps} updateForm={updateForm} />);

    fireEvent.change(screen.getByPlaceholderText('Observaciones de la misión...'), {
      target: { value: 'Todo en orden' },
    });
    expect(updateForm).toHaveBeenCalledWith({ description: 'Todo en orden' });
  });

  it('AT-RCP-IMG-1: fuelTicketImage como array JSON válido se decodifica y quitar una imagen invoca updateForm', () => {
    const updateForm = vi.fn();
    render(
      <RouteClosurePanel
        {...defaultProps}
        updateForm={updateForm}
        formData={{ ...defaultProps.formData, fuelTicketImage: JSON.stringify(['ticket1.jpg']) }}
      />
    );

    const img = screen.getByAltText('Vista 1');
    const removeBtn = img.closest('.relative.group')!.querySelector('button') as HTMLButtonElement;
    fireEvent.click(removeBtn);
    expect(updateForm).toHaveBeenCalledWith({ fuelTicketImage: '' });
  });

  it('AT-RCP-IMG-2: fuelTicketImage como array JSON malformado cae al catch (usa el string crudo)', () => {
    render(
      <RouteClosurePanel
        {...defaultProps}
        formData={{ ...defaultProps.formData, fuelTicketImage: '[not-valid-json' }}
      />
    );
    expect(screen.getByAltText('Vista 1')).toHaveAttribute('src', '[not-valid-json');
  });

  it('AT-RCP-IMG-3: fuelTicketImage como string plano (no-array) se usa directamente', () => {
    render(
      <RouteClosurePanel
        {...defaultProps}
        formData={{ ...defaultProps.formData, fuelTicketImage: 'ticket-plano.jpg' }}
      />
    );
    expect(screen.getByAltText('Vista 1')).toHaveAttribute('src', 'ticket-plano.jpg');
  });
});
