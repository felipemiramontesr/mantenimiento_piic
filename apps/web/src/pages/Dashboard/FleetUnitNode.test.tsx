import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import api from '../../api/client';
import FleetUnitNode from './FleetUnitNode';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ unitId: 'ASM-001' }) };
});

const UNIT_FIXTURE = {
  id: 'ASM-001',
  status: 'Disponible',
  marca: 'Nissan',
  modelo: 'Frontier',
  year: 2022,
  color: 'Blanco',
  odometer: 55000,
  placas: 'ABC-123',
  numeroSerie: 'SN-12345',
  circulationCardNumber: 'TC-999',
  uso: 'Carga',
  accountingAccount: '1.1.2.01',
  owner: 'PIIC SA de CV',
  monthlyLeasePayment: 12000,
  motor: '2.5L Diesel',
  fuelType: 'Diesel',
  traccion: '4x4',
  transmision: 'Automática',
  tireSpec: '265/70 R17',
  dailyUsageAvg: 42,
  capacidadCarga: 1500,
  fuelTankCapacity: 80,
  lastFuelLevel: 65,
  departamento: 'Logística',
  assetType: 'Vehículo',
  lastServiceDate: '2026-01-15',
  lastServiceReading: 45000,
  nextServiceReading: 55000,
  maintIntervalKm: 10000,
  maintIntervalDays: 90,
  healthScore: 92,
  availabilityIndex: 98,
  mtbfHours: 720,
  mttrHours: 4,
  backlogCount: 0,
  healthStatus: 'Bueno',
  insuranceExpiryDate: '2027-01-01',
  insurancePolicyNumber: 'POL-123',
  insuranceCost: 24000,
  vencimientoVerificacion: '2026-12-01',
  environmentalHologram: '0',
  legalComplianceDate: '2026-06-01',
  lastMechanicalVerification: '2026-03-01',
  lastEnvironmentalVerification: '2026-04-01',
  protocolStartDate: '2024-01-01',
  images: [],
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const NODE_FIXTURE = {
  unit: UNIT_FIXTURE,
  maintenance: {
    recentHistory: [
      {
        uuid: 'maint-001',
        service_date: '2026-01-15',
        service_type: 'BASIC_10K',
        service_mode: 'WORKSHOP',
        cost: 3500,
        technician: 'Juan Mecánico',
        odometer: 45000,
        status: 'COMPLETED',
      },
    ],
  },
  financial: {
    year: 2026,
    totalCost: 15000,
    byCategory: { MAINTENANCE: 8000, FUEL: 5000, INSURANCE: 2000 },
  },
  incidents: {
    recent: [
      {
        id: 1,
        category: 'MECANICA',
        description: 'Falla en suspensión delantera',
        severity: 'LOW',
        status: 'RESOLVED',
        reported_at: '2026-05-01T10:00:00.000Z',
      },
    ],
    openCount: 0,
  },
};

describe('FleetUnitNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: NODE_FIXTURE } });
  });

  it('renders unit ID and model in header', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Nissan/).length).toBeGreaterThan(0);
  });

  it('renders identity card with placas and propietario', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Placas')).toBeInTheDocument());
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('PIIC SA de CV')).toBeInTheDocument();
  });

  it('renders technical specs card', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Motor')).toBeInTheDocument());
    expect(screen.getByText('2.5L Diesel')).toBeInTheDocument();
    expect(screen.getByText('Automática')).toBeInTheDocument();
  });

  it('renders maintenance history table with records', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Juan Mecánico')).toBeInTheDocument());
  });

  it('renders financial summary section', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Resumen Financiero 2026')).toBeInTheDocument());
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
  });

  it('renders compliance & legal card', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Cumplimiento & Legal')).toBeInTheDocument());
    expect(screen.getByText('Vencimiento seguro')).toBeInTheDocument();
  });

  it('renders incidents section when recent incidents exist', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Incidentes Recientes')).toBeInTheDocument());
    expect(screen.getByText('Falla en suspensión delantera')).toBeInTheDocument();
  });

  it('does not render incidents section when list is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...NODE_FIXTURE, incidents: { recent: [], openCount: 0 } },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());
    expect(screen.queryByText('Incidentes Recientes')).toBeNull();
  });

  it('renders open incidents badge when openCount > 0', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          incidents: { ...NODE_FIXTURE.incidents, openCount: 2 },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText(/2 incidentes/i)).toBeInTheDocument());
  });

  it('renders "Sin transacciones" when totalCost is zero', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          financial: { year: 2026, totalCost: 0, byCategory: {} },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() =>
      expect(screen.getByText(/Sin transacciones registradas/i)).toBeInTheDocument()
    );
  });

  it('handles null nextServiceReading (kmRemaining = null)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: { ...NODE_FIXTURE.unit, nextServiceReading: null },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    // Km restantes shows "—" when null
    expect(screen.getByText('Km restantes')).toBeInTheDocument();
  });

  it('calls API with unitId from route params', () => {
    render(<FleetUnitNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet/ASM-001/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<FleetUnitNode />);
    expect(await screen.findByText(/No se pudo cargar el nodo de la unidad/i)).toBeInTheDocument();
  });

  it('shows Abierto label for OPEN incident status', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          incidents: {
            openCount: 1,
            recent: [{ ...NODE_FIXTURE.incidents.recent[0], status: 'OPEN' }],
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Incidentes Recientes')).toBeInTheDocument());
    expect(screen.getByText('Abierto')).toBeInTheDocument();
  });

  it('shows Resuelto label for non-OPEN incident status', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Incidentes Recientes')).toBeInTheDocument());
    expect(screen.getByText('Resuelto')).toBeInTheDocument();
  });

  it('renders unknown severity as fallback badge in incident list', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          incidents: {
            openCount: 0,
            recent: [{ ...NODE_FIXTURE.incidents.recent[0], severity: 'EXTREME' }],
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Incidentes Recientes')).toBeInTheDocument());
    expect(screen.getAllByText('EXTREME').length).toBeGreaterThan(0);
  });

  it('renders null for insuranceCost when value is 0', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: { ...NODE_FIXTURE.unit, insuranceCost: 0 },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Cumplimiento & Legal')).toBeInTheDocument());
    expect(screen.getByText('Costo del seguro')).toBeInTheDocument();
  });
});
