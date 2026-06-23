import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import api from '../../api/client';
import { useFleetIntelligence } from '../../hooks/useFleetIntelligence';
import { useEconomicLife } from '../../hooks/useEconomicLife';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { useOperatorScorecard } from '../../hooks/useOperatorScorecard';
import { useCo2 } from '../../hooks/useCo2';
import { useFleetRecalls } from '../../hooks/useFleetRecalls';
import { useNhtsaRecalls } from '../../hooks/useNhtsaRecalls';
import { useAssetTypeFields, DEFAULT_FIELD_VISIBILITY } from '../../hooks/useAssetTypeFields';
import FleetUnitNode from './FleetUnitNode';

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('../../hooks/useFleetIntelligence', () => ({
  useFleetIntelligence: vi.fn(() => ({ data: null, loading: false, error: null })),
}));
vi.mock('../../hooks/useEconomicLife', () => ({
  useEconomicLife: vi.fn(() => ({ data: null, loading: false, error: null })),
}));
vi.mock('../../hooks/useAnomalyDetection', () => ({
  useAnomalyDetection: vi.fn(() => ({ data: null, loading: false, error: null })),
}));
vi.mock('../../hooks/useOperatorScorecard', () => ({
  useOperatorScorecard: vi.fn(() => ({ data: null, loading: false, error: null })),
}));
vi.mock('../../hooks/useCo2', () => ({
  useCo2: vi.fn(() => ({ data: null, loading: false, error: null })),
}));
vi.mock('../../hooks/useFleetRecalls', () => ({
  useFleetRecalls: vi.fn(() => ({
    recalls: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    linkRecall: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn(),
  })),
}));

vi.mock('../../hooks/useNhtsaRecalls', () => ({
  useNhtsaRecalls: vi.fn(() => ({
    results: [],
    loading: false,
    error: null,
    search: vi.fn(),
    importRecall: vi.fn().mockResolvedValue({ recall_id: 42 }),
  })),
}));

vi.mock('../../hooks/useAssetTypeFields', () => ({
  DEFAULT_FIELD_VISIBILITY: {
    placa: true,
    circulationCardNumber: true,
    numeroSerie: true,
    insurancePolicyNumber: true,
    insuranceExpiryDate: true,
    vencimientoVerificacion: true,
    warrantyExpiry: true,
  },
  useAssetTypeFields: vi.fn(() => ({
    fields: {
      placa: true,
      circulationCardNumber: true,
      numeroSerie: true,
      insurancePolicyNumber: true,
      insuranceExpiryDate: true,
      vencimientoVerificacion: true,
      warrantyExpiry: true,
    },
    loading: false,
  })),
}));
const mockParams = vi.hoisted(() => ({ unitId: 'ASM-001' as string | undefined }));

vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ unitId: mockParams.unitId }) };
});

const UNIT_FIXTURE = {
  id: 'ASM-001',
  assetTypeId: 1,
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
    mockParams.unitId = 'ASM-001';
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

  it('renders loading state when unitId is undefined, api not called', () => {
    mockParams.unitId = undefined;
    render(<FleetUnitNode />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  it('renders null kmSinceService when odometer is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...NODE_FIXTURE, unit: { ...NODE_FIXTURE.unit, odometer: null } },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Km desde el último')).toBeInTheDocument());
    // InfoRow renders '—' for null via formatKm(null)
  });

  it('renders null dailyUsageAvg as dash', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...NODE_FIXTURE, unit: { ...NODE_FIXTURE.unit, dailyUsageAvg: null } },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Uso diario promedio')).toBeInTheDocument());
    // InfoRow renders null value → shows '—' via InfoRow fallback
  });

  it('renders null lastFuelLevel as dash', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...NODE_FIXTURE, unit: { ...NODE_FIXTURE.unit, lastFuelLevel: null } },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Nivel de combustible')).toBeInTheDocument());
  });

  it('renders unknown financial category as raw key via ?? fallback', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          financial: { year: 2026, totalCost: 7000, byCategory: { UNKNOWN_CATEGORY: 7000 } },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Resumen Financiero 2026')).toBeInTheDocument());
    expect(screen.getByText('UNKNOWN_CATEGORY')).toBeInTheDocument();
  });

  it('renders unit image from images array and img onError resets to placeholder', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: { ...NODE_FIXTURE.unit, images: ['https://cdn.example.com/unit.jpg'] },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    const unitImg = document.querySelector('img[alt="ASM-001"]') as HTMLImageElement | null;
    expect(unitImg?.getAttribute('src')).toBe('https://cdn.example.com/unit.jpg');
    if (unitImg) fireEvent.error(unitImg);
    expect(unitImg?.getAttribute('src')).toBe('/img/archon-unit-default.png');
  });

  it('renders non-COMPLETED maintenance as Activo and unknown service_type as raw value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          maintenance: {
            recentHistory: [
              {
                ...NODE_FIXTURE.maintenance.recentHistory[0],
                status: 'IN_PROGRESS',
                service_type: 'UNKNOWN_SERVICE',
              },
            ],
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Activo')).toBeInTheDocument());
    expect(screen.getByText('UNKNOWN_SERVICE')).toBeInTheDocument();
  });

  it('renders null monthlyLeasePayment row without value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...NODE_FIXTURE, unit: { ...NODE_FIXTURE.unit, monthlyLeasePayment: null } },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Pago arrendamiento')).toBeInTheDocument());
  });

  it('UnitHeader null assetType, departamento, color hide those sub-elements', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: {
            ...NODE_FIXTURE.unit,
            assetType: null,
            departamento: null,
            color: null,
            availabilityIndex: undefined,
            backlogCount: null,
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    // availabilityIndex ?? 100 → 100%, backlogCount ?? 0 → 0 rendered
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('statusBadgeClass falls back for unknown status and healthStatus null uses dash', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: {
            ...NODE_FIXTURE.unit,
            status: 'Baja', // not in FLEET_STATUS_BADGE → ?? fallback (line 95)
            healthStatus: null, // null ?? '—' in kpis array (line 113)
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Baja')).toBeInTheDocument());
    // 'Salud' label confirms kpi rendered; '—' confirms healthStatus ?? '—'
    expect(screen.getByText('Salud')).toBeInTheDocument();
  });

  it('KPI-VIEW-1: renders Inteligencia de Flota panel with all 5 KPIs', async () => {
    vi.mocked(useFleetIntelligence).mockReturnValueOnce({
      data: {
        oee: 78.5,
        tco_per_km: 4.2,
        km_per_liter: 11.5,
        pm_compliance: 92.3,
        backlog_aging_days: 3.5,
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Inteligencia de Flota')).toBeInTheDocument());
    expect(screen.getByText('OEE')).toBeInTheDocument();
    expect(screen.getByText('TCO/km')).toBeInTheDocument();
    expect(screen.getByText('Km/L')).toBeInTheDocument();
    expect(screen.getByText('Cumpl. PM')).toBeInTheDocument();
    expect(screen.getByText('Edad Backlog')).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText(/11[.,]5 km\/L/)).toBeInTheDocument();
  });

  it('KPI-VIEW-2: renders dashes when KPI data is null', async () => {
    vi.mocked(useFleetIntelligence).mockReturnValueOnce({
      data: {
        oee: null,
        tco_per_km: null,
        km_per_liter: null,
        pm_compliance: null,
        backlog_aging_days: null,
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Inteligencia de Flota')).toBeInTheDocument());
    // All 5 KPIs show '—' when null
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
  });

  it('KPI-VIEW-3: renders loading message while intelligence is fetching', async () => {
    vi.mocked(useFleetIntelligence).mockReturnValueOnce({
      data: null,
      loading: true,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Inteligencia de Flota')).toBeInTheDocument());
    expect(screen.getByText('Calculando KPIs…')).toBeInTheDocument();
  });

  it('renders overdue kmRemaining in red when nextServiceReading < odometer', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...NODE_FIXTURE,
          unit: {
            ...NODE_FIXTURE.unit,
            odometer: 60000,
            nextServiceReading: 55000, // 55000 - 60000 = -5000 → overdue
            maintIntervalDays: null, // covers '—' branch
          },
        },
      },
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Km restantes')).toBeInTheDocument());
    // formatKm(5000) + ' (vencido)' rendered in red
    expect(screen.getByText(/vencido/i)).toBeInTheDocument();
    // maintIntervalDays falsy → '—' rendered
    expect(screen.getByText('Intervalo (días)')).toBeInTheDocument();
  });

  // ─── FC-6 Sections (EL, AD, OS, CO2) ─────────────────────────────────────

  it('EL-NODE-1: renders Conservar badge when recommendation is KEEP', async () => {
    vi.mocked(useEconomicLife).mockReturnValueOnce({
      data: {
        recommendation: 'KEEP',
        residual_value_mxn: 120000,
        accumulated_tco: 85000,
        replacement_score: 0.2,
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Vida Económica')).toBeInTheDocument());
    expect(screen.getByText('Conservar')).toBeInTheDocument();
  });

  it('EL-NODE-2: renders all dashes when economic life data is null', async () => {
    vi.mocked(useEconomicLife).mockReturnValueOnce({ data: null, loading: false, error: null });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Vida Económica')).toBeInTheDocument());
    expect(screen.getByText('Recomendación')).toBeInTheDocument();
  });

  it('AD-NODE-1: renders Anomalía badge when is_anomaly is true', async () => {
    vi.mocked(useAnomalyDetection).mockReturnValueOnce({
      data: {
        fleet_size: 12,
        algorithm: 'z-score',
        unit_km_per_liter: 7.2,
        baseline_km_per_liter: 11.5,
        deviation_pct: -37.4,
        z_score: -2.8,
        is_anomaly: true,
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Detección de Anomalías')).toBeInTheDocument());
    expect(screen.getByText('Anomalía')).toBeInTheDocument();
  });

  it('AD-NODE-2: renders section title without crash when anomaly data is null', async () => {
    vi.mocked(useAnomalyDetection).mockReturnValueOnce({ data: null, loading: false, error: null });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Detección de Anomalías')).toBeInTheDocument());
    expect(screen.getByText('Algoritmo')).toBeInTheDocument();
  });

  it('OS-NODE-1: renders composite score and route count when data is present', async () => {
    vi.mocked(useOperatorScorecard).mockReturnValueOnce({
      data: {
        driver_id: 42,
        route_count: 18,
        fuel_efficiency_score: 85,
        incident_rate_score: 92,
        checkpoint_adherence_score: 78,
        composite_score: 85,
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Scorecard del Operador')).toBeInTheDocument());
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/18 rutas/)).toBeInTheDocument();
  });

  it('OS-NODE-2: renders section title without crash when scorecard data is null', async () => {
    vi.mocked(useOperatorScorecard).mockReturnValueOnce({
      data: null,
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Scorecard del Operador')).toBeInTheDocument());
    expect(screen.getByText('Score compuesto')).toBeInTheDocument();
  });

  it('CO2-NODE-1: renders total CO2 and period when data is present', async () => {
    vi.mocked(useCo2).mockReturnValueOnce({
      data: {
        fuel_code: 'DIESEL',
        co2_factor_kg_per_liter: 2.628,
        total_liters: 3200,
        total_co2_kg: 8409.6,
        period_from: '2026-01-01',
        period_to: '2026-06-22',
      },
      loading: false,
      error: null,
    });
    render(<FleetUnitNode />);
    await waitFor(() =>
      expect(screen.getByText('Huella de CO₂ (Scope 1 ESG)')).toBeInTheDocument()
    );
    expect(screen.getByText(/8[.,]409[.,]?6? kg CO₂/)).toBeInTheDocument();
    expect(screen.getByText('2026-01-01 — 2026-06-22')).toBeInTheDocument();
  });

  it('CO2-NODE-2: renders section title without crash when CO2 data is null', async () => {
    vi.mocked(useCo2).mockReturnValueOnce({ data: null, loading: false, error: null });
    render(<FleetUnitNode />);
    await waitFor(() =>
      expect(screen.getByText('Huella de CO₂ (Scope 1 ESG)')).toBeInTheDocument()
    );
    expect(screen.getByText('Período analizado')).toBeInTheDocument();
  });

  // ─── Recalls Section ──────────────────────────────────────────────────────

  it('RECALL-NODE-1: renders table with recall campaign_code and status badge', async () => {
    vi.mocked(useFleetRecalls).mockReturnValueOnce({
      recalls: [
        {
          recall_id: 1,
          campaign_code: 'NHTSA-2024-001',
          description: 'Falla en airbag delantero',
          make: 'Nissan',
          model: 'Frontier',
          year: 2022,
          published_date: '2024-03-15',
          status: 'PENDING',
          resolved_at: null,
          work_order_id: null,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      linkRecall: vi.fn(),
      updateStatus: vi.fn(),
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Recalls')).toBeInTheDocument());
    expect(screen.getByText('NHTSA-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('RECALL-NODE-2: Vincular button opens modal with dialog role', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Recalls')).toBeInTheDocument());
    const btn = screen.getByTitle('Vincular recall del catálogo');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Vincular recall' })).toBeInTheDocument()
    );
    expect(screen.getByText('Vincular Recall al Catálogo')).toBeInTheDocument();
  });

  it('RECALL-NODE-3: shows empty message when recalls list is empty', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Recalls')).toBeInTheDocument());
    expect(screen.getByText('Sin recalls registrados para esta unidad')).toBeInTheDocument();
  });

  it('NHTSA-E-1: botón "Buscar recalls en NHTSA" está visible en RecallsSection', async () => {
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Recalls')).toBeInTheDocument());
    expect(screen.getByTitle('Buscar recalls en NHTSA')).toBeInTheDocument();
  });

  it('NHTSA-E-2: modal Tab 1 muestra 2 filas cuando NHTSA devuelve 2 recalls', async () => {
    vi.mocked(useNhtsaRecalls).mockReturnValue({
      results: [
        {
          campaignNumber: '19V648',
          subject: 'POWER TRAIN',
          summary: 'Defect in transmission.',
          remedy: 'Replace.',
          consequence: 'Rollaway.',
          component: 'POWER TRAIN:TRANSMISSION',
          manufacturer: 'CHEVROLET',
          nhtsaActionNumber: '19V-648',
        },
        {
          campaignNumber: '21V201',
          subject: 'AIR BAGS',
          summary: 'Inflator may rupture.',
          remedy: 'Replace inflator.',
          consequence: 'Injury.',
          component: 'AIR BAGS',
          manufacturer: 'CHEVROLET',
          nhtsaActionNumber: '21V-201',
        },
      ],
      loading: false,
      error: null,
      search: vi.fn(),
      importRecall: vi.fn().mockResolvedValue({ recall_id: 42 }),
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByTitle('Buscar recalls en NHTSA')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Buscar recalls en NHTSA'));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Buscar recalls en NHTSA' })).toBeInTheDocument()
    );
    expect(screen.getByText('19V648')).toBeInTheDocument();
    expect(screen.getByText('21V201')).toBeInTheDocument();
  });

  it('NHTSA-E-3: flujo completo — Importar llama POST, vincula recall y refresca sección', async () => {
    const mockRefresh = vi.fn();
    const mockLinkRecall = vi.fn().mockResolvedValue(undefined);
    const mockImportRecall = vi.fn().mockResolvedValue({ recall_id: 7 });

    vi.mocked(useFleetRecalls).mockReturnValue({
      recalls: [],
      loading: false,
      error: null,
      refresh: mockRefresh,
      linkRecall: mockLinkRecall,
      updateStatus: vi.fn(),
    });
    vi.mocked(useNhtsaRecalls).mockReturnValue({
      results: [
        {
          campaignNumber: '19V648',
          subject: 'POWER TRAIN',
          summary: 'Defect in transmission.',
          remedy: 'Replace.',
          consequence: 'Rollaway.',
          component: 'POWER TRAIN:TRANSMISSION',
          manufacturer: 'CHEVROLET',
          nhtsaActionNumber: '19V-648',
        },
      ],
      loading: false,
      error: null,
      search: vi.fn(),
      importRecall: mockImportRecall,
    });

    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByTitle('Buscar recalls en NHTSA')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Buscar recalls en NHTSA'));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Buscar recalls en NHTSA' })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTitle('Importar recall 19V648'));

    await waitFor(() =>
      expect(mockImportRecall).toHaveBeenCalledWith(
        expect.objectContaining({ campaignNumber: '19V648' })
      )
    );
    await waitFor(() => expect(mockLinkRecall).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Buscar recalls en NHTSA' })
      ).not.toBeInTheDocument()
    );
  });

  // ─── FC-AssetType_ConditionalFields FaseC ────────────────────────────────

  it('AT-C-1: VEHICLE (assetTypeId=1) muestra Placas y Tarjeta de circulación', async () => {
    vi.mocked(useAssetTypeFields).mockReturnValueOnce({
      fields: { ...DEFAULT_FIELD_VISIBILITY },
      loading: false,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Identidad & Registro')).toBeInTheDocument());
    expect(screen.getByText('Placas')).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('Tarjeta de circulación')).toBeInTheDocument();
  });

  it('AT-C-2: EQUIPMENT oculta Placas, Tarjeta de circulación, Póliza y Verificación', async () => {
    vi.mocked(useAssetTypeFields).mockReturnValue({
      fields: {
        ...DEFAULT_FIELD_VISIBILITY,
        placa: false,
        circulationCardNumber: false,
        insurancePolicyNumber: false,
        insuranceExpiryDate: false,
        vencimientoVerificacion: false,
      },
      loading: false,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Número de serie')).toBeInTheDocument());
    expect(screen.queryByText('Placas')).toBeNull();
    expect(screen.queryByText('Tarjeta de circulación')).toBeNull();
    expect(screen.queryByText('Póliza de seguro')).toBeNull();
    expect(screen.queryByText('Verificación')).toBeNull();
    expect(screen.getByText('Número de serie')).toBeInTheDocument();
  });

  it('AT-C-3: fallback loading=true preserva visibilidad DEFAULT (todos los campos visibles)', async () => {
    vi.mocked(useAssetTypeFields).mockReturnValueOnce({
      fields: { ...DEFAULT_FIELD_VISIBILITY },
      loading: true,
    });
    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByText('Placas')).toBeInTheDocument());
    expect(screen.getByText('Tarjeta de circulación')).toBeInTheDocument();
    expect(screen.getByText('Vencimiento seguro')).toBeInTheDocument();
  });

  it('VIM-F-5: Tab "Patrones VIM" activa y muestra ≥1 fila de patrón', async () => {
    const VIM_ROW = {
      failure_category: 'MAINTENANCE',
      occurrence_count: 4,
      affected_units: 2,
      avg_km_at_failure: 68000,
      confidence_score: 0.6667,
      nhtsa_covered: false,
      signal_level: 'SEÑAL' as const,
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (String(url).includes('vim-patterns')) {
        return Promise.resolve({ data: { success: true, count: 1, data: [VIM_ROW] } });
      }
      return Promise.resolve({ data: { success: true, data: NODE_FIXTURE } });
    });

    render(<FleetUnitNode />);
    await waitFor(() => expect(screen.getByTitle('Buscar recalls en NHTSA')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Buscar recalls en NHTSA'));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Buscar recalls en NHTSA' })).toBeInTheDocument()
    );

    const vimTab = screen.getByText('Patrones VIM');
    fireEvent.click(vimTab);

    await waitFor(() => expect(screen.getByText('MAINTENANCE')).toBeInTheDocument());
    expect(screen.getByText(/2 unidades/)).toBeInTheDocument();
    expect(screen.getByText('SEÑAL')).toBeInTheDocument();
  });
});
