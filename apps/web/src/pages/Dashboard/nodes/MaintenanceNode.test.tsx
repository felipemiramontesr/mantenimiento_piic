import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import api from '../../../api/client';
import MaintenanceNode from './MaintenanceNode';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
const mockParams = vi.hoisted(() => ({ uuid: 'maint-uuid-0001' as string | undefined }));
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ uuid: mockParams.uuid }) };
});

const TASK_PASS = {
  taskCode: 'OIL_CHANGE',
  status: 'PASS',
  notes: 'Aceite cambiado',
  label: 'Cambio de aceite',
  isCritical: true,
  statusLabel: 'OK',
};

const TASK_FAIL = {
  taskCode: 'BRAKE_CHECK',
  status: 'FAIL',
  notes: null,
  label: 'Revisión de frenos',
  isCritical: false,
  statusLabel: 'Falla',
};

const ORDER_FIXTURE = {
  uuid: 'maint-uuid-0001-xxxx',
  unit_id: 'ASM-003',
  movement_status: 'COMPLETED',
  service_date: '2026-05-29',
  odometer_at_service: 50000,
  odometer_at_close: 50010,
  fuel_level_start: 75,
  fuel_level_end: 70,
  fuel_liters_loaded: 0,
  fuel_amount: 0,
  service_type: 'BASIC_10K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'BASIC_10K',
  cost: 3500,
  technician: 'Carlos López',
  created_at: '2026-05-29T08:00:00.000Z',
  start_at: '2026-05-29T08:00:00.000Z',
  end_at: '2026-05-29T16:00:00.000Z',
  details: [TASK_PASS, TASK_FAIL],
};

const UNIT_FIXTURE = {
  id: 'ASM-003',
  status: 'Disponible',
  marca: 'Nissan',
  modelo: 'Frontier',
  year: 2021,
  odometer: 50010,
  maintIntervalKm: 10000,
  lastFuelLevel: 70,
};

const NODE_FIXTURE = { order: ORDER_FIXTURE, unit: UNIT_FIXTURE };

describe('MaintenanceNode', () => {
  beforeEach(() => {
    mockParams.uuid = 'maint-uuid-0001';
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: NODE_FIXTURE } });
  });

  it('renders technician and service type in header', async () => {
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Servicio Básico 10K/).length).toBeGreaterThan(0);
  });

  it('shows failed tasks badge when there are FAIL tasks', async () => {
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getByText(/1 tarea fallida/)).toBeInTheDocument());
  });

  it('renders task list with critical indicator', async () => {
    render(<MaintenanceNode />);
    expect(await screen.findByText('Cambio de aceite')).toBeInTheDocument();
    expect(screen.getByTitle('Tarea crítica')).toBeInTheDocument();
  });

  it('renders unit cross-link to fleet node', async () => {
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    const unitLink = screen.getByRole('link', { name: /ASM-003/i });
    expect(unitLink.getAttribute('href')).toBe('/dashboard/fleet/ASM-003');
  });

  it('renders unit telemetry section when unit data is present', async () => {
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getByText('Telemetría')).toBeInTheDocument());
    // Both unit rows appear inside the telemetry section
    expect(screen.getByText('Intervalo mant.')).toBeInTheDocument();
  });

  it('renders without unit link when unit is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: { order: ORDER_FIXTURE, unit: null } },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    expect(screen.queryByRole('link', { name: /ASM-003/i })).toBeNull();
  });

  it('renders null for tipo recomendado when system_recommended_type is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, system_recommended_type: null },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    expect(screen.getByText('Tipo recomendado')).toBeInTheDocument();
  });

  it('calls API with uuid from route params', () => {
    render(<MaintenanceNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/maintenance/maint-uuid-0001/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<MaintenanceNode />);
    expect(
      await screen.findByText(/No se pudo cargar la orden de mantenimiento/i)
    ).toBeInTheDocument();
  });

  it('renders plural "tareas fallidas" when failCount > 1', async () => {
    const TWO_FAIL = [
      TASK_FAIL,
      { ...TASK_FAIL, taskCode: 'TIRE_CHECK', label: 'Revisión llantas' },
    ];
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { order: { ...ORDER_FIXTURE, details: TWO_FAIL }, unit: UNIT_FIXTURE },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getByText(/2 tareas fallidas/)).toBeInTheDocument());
  });

  it('renders fuel_liters_loaded and fuel_amount when set', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, fuel_liters_loaded: 40, fuel_amount: 900 },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    expect(screen.getByText('40 L')).toBeInTheDocument();
    expect(screen.getByText('$900')).toBeInTheDocument();
  });

  it('renders unknown service_type as raw value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, service_type: 'SPECIAL_MINING' },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('SPECIAL_MINING').length).toBeGreaterThan(0));
  });

  it('renders unknown service_mode as raw value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, service_mode: 'REMOTE' },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('Carlos López').length).toBeGreaterThan(0));
    expect(screen.getAllByText('REMOTE').length).toBeGreaterThan(0);
  });

  it('renders unknown movement_status badge as raw value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, movement_status: 'UNKNOWN_STATUS' },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('UNKNOWN_STATUS').length).toBeGreaterThan(0));
  });

  it('renders loading state when uuid is undefined, api not called', () => {
    mockParams.uuid = undefined;
    render(<MaintenanceNode />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  it('renders unknown system_recommended_type as raw value via ?? fallback', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, system_recommended_type: 'SPECIAL_OVERHAUL' },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getAllByText('SPECIAL_OVERHAUL').length).toBeGreaterThan(0));
  });

  it('renders task with unknown status using fallback color', async () => {
    const TASK_UNKNOWN = {
      taskCode: 'UNKNOWN_TASK',
      status: 'CUSTOM_STATUS',
      notes: 'Some note',
      label: 'Custom Task',
      isCritical: false,
      statusLabel: 'Custom',
    };
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          order: { ...ORDER_FIXTURE, details: [TASK_UNKNOWN] },
          unit: UNIT_FIXTURE,
        },
      },
    });
    render(<MaintenanceNode />);
    await waitFor(() => expect(screen.getByText('Custom Task')).toBeInTheDocument());
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
