import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import RouteIdentityPanel from './RouteIdentityPanel';
import { RouteIdentityPanelProps } from './types';
import { FleetUnit } from '../../../types/fleet';

/**
 * FC162 F2 — RouteIdentityPanel.tsx had zero test coverage (excluded via the
 * former RouteAssignment/** glob, never exercised — RouteAssignmentForm's own
 * test never reaches this deep into the wizard). Covers unit/operator
 * selection callbacks and the conditional unit-preview/validation-hint branches.
 */

const BASE_PROPS: RouteIdentityPanelProps = {
  formData: {
    unitId: '',
    operatorId: '',
    origin: '',
    destination: '',
    description: '',
    fuelLevel: '',
    arrivalFuelLevel: '',
    startReading: 1000,
    endReading: 1500,
    fuelLitersLoaded: '',
    fuelAmount: '',
    fuelTicketImage: '',
    additivesCheck: false,
    tirePressureJson: '',
    checklistJson: '',
  },
  updateForm: vi.fn(),
  isEdit: false,
  isFinished: false,
  availableUnits: [{ value: 'ASM-001', label: 'ASM-001' }],
  operatorOptions: [{ value: '2', label: 'Ana Carrillo' }],
  selectedUnitData: null,
};

const UNIT: FleetUnit = {
  id: 'ASM-001',
  marca: 'Toyota',
  modelo: 'Hilux',
  placas: 'ABC-123',
  departamento: 'Operaciones',
  lastFuelLevel: 80,
  images: [],
} as unknown as FleetUnit;

describe('RouteIdentityPanel', () => {
  it('renders the Fase I header and both selectors', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} />);
    expect(screen.getByText('Identidad del Servicio')).toBeInTheDocument();
    expect(screen.getByText('Clave o modelo...')).toBeInTheDocument();
    expect(screen.getByText('Buscar por nombre o nómina...')).toBeInTheDocument();
  });

  it('selecting a unit calls updateForm with the unitId', () => {
    const updateForm = vi.fn();
    render(<RouteIdentityPanel {...BASE_PROPS} updateForm={updateForm} />);
    fireEvent.click(screen.getByText('Clave o modelo...'));
    fireEvent.click(screen.getByText('ASM-001'));
    expect(updateForm).toHaveBeenCalledWith({ unitId: 'ASM-001' });
  });

  it('selecting an operator calls updateForm with the operatorId', () => {
    const updateForm = vi.fn();
    render(<RouteIdentityPanel {...BASE_PROPS} updateForm={updateForm} />);
    fireEvent.click(screen.getByText('Buscar por nombre o nómina...'));
    fireEvent.click(screen.getByText('Ana Carrillo'));
    expect(updateForm).toHaveBeenCalledWith({ operatorId: '2' });
  });

  it('does not render the unit-preview card when no unit is selected', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} />);
    expect(screen.queryByText('No Media')).not.toBeInTheDocument();
  });

  it('renders the unit-preview card with telemetry hint when a unit is selected and not editing', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} selectedUnitData={UNIT} />);
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('Telemetría Heredada: 80%')).toBeInTheDocument();
  });

  it('renders the unit thumbnail image when the unit has at least one image', () => {
    const unitWithImage: FleetUnit = { ...UNIT, images: ['/img/unit-front.png'] } as FleetUnit;
    render(<RouteIdentityPanel {...BASE_PROPS} selectedUnitData={unitWithImage} />);
    expect(screen.getByAltText('Unit')).toHaveAttribute('src', '/img/unit-front.png');
  });

  it('hides the telemetry hint when editing an existing route', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} selectedUnitData={UNIT} isEdit />);
    expect(screen.queryByText(/Telemetría Heredada/)).not.toBeInTheDocument();
  });

  it('shows the emerald dispatch hint when creating a new (non-edit) route', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} />);
    expect(screen.getByText(/EN RUTA/)).toBeInTheDocument();
  });

  it('shows the amber close-out hint (with formatted endReading) when editing', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} isEdit />);
    expect(screen.getByText('1,500 KM')).toBeInTheDocument();
  });

  it('hides the validation hint entirely once the route is finished', () => {
    render(<RouteIdentityPanel {...BASE_PROPS} isFinished />);
    expect(screen.queryByText(/EN RUTA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/KM$/)).not.toBeInTheDocument();
  });
});
