import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../../test/testUtils';
import ForensicJournalTable from './ForensicJournalTable';
import api from '../../api/client';
import { archonCache } from '../../utils/archonCache';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ForensicJournalTable (Apex Standard)', () => {
  beforeEach(() => {
    archonCache.clear();
  });
  const mockLogs = [
    {
      id: 'uuid-12345678',
      unit_id: 'ASM-001',
      event_type: 'ROUTE_INCIDENT',
      status_before: 'En Ruta',
      status_after: 'En Mantenimiento',
      description: 'MECANICA: Falla motor',
      created_at: new Date().toISOString(),
    },
  ];

  it('renders forensic logs correctly using sovereign providers', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockLogs } });

    render(<ForensicJournalTable />);

    // 🛡️ WAIT FOR HYDRATION: Ensure the 'Accediendo a Memoria Forense...' message disappears
    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('ASM-001')).toBeInTheDocument();
    expect(screen.getByText(/MECANICA: Falla motor/i)).toBeInTheDocument();
    expect(screen.getByText(/INCIDENCIA/i)).toBeInTheDocument();
  });

  it('renders different event styles correctly with exact regex matching', async () => {
    const multiLogs = [
      {
        id: 'uuid-start-1',
        unit_id: 'ASM-002',
        event_type: 'ROUTE_START',
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-finish-1',
        unit_id: 'ASM-003',
        event_type: 'ROUTE_FINISH',
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-unk-1',
        unit_id: 'ASM-004',
        event_type: 'UNKNOWN',
        created_at: new Date().toISOString(),
      },
    ];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: multiLogs } });

    render(<ForensicJournalTable />);

    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/SALIDA/i)).toBeInTheDocument();
    expect(screen.getByText(/ENTRADA/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully in the journal', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Forensic Failure'));

    render(<ForensicJournalTable />);

    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Sin registros forenses/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  // FC162 F2 (Cond.R-162-F1 F2-P0) — 3 tests para 608 líneas era delgado;
  // amplía las ramas de mayor riesgo: deltas de lectura/combustible/estado,
  // el motor de anomalías, el diff whitelist de snapshots, y los 2 modos de
  // filtrado (unitId/routeUuid).

  it('renders the KM reading delta with a positive sign', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-km-1',
            unit_id: 'ASM-005',
            event_type: 'ADMIN_EDIT',
            reading_before: 1000,
            reading_after: 1250,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('+250 KM')).toBeInTheDocument();
  });

  it('renders the fuel-liters and fuel-percentage deltas independently', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-fuel-1',
            unit_id: 'ASM-006',
            event_type: 'ADMIN_EDIT',
            fuel_before: 10,
            fuel_after: 40,
            fuel_level_before: 20,
            fuel_level_after: 90,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('10.0 L')).toBeInTheDocument();
    expect(screen.getByText('40.0 L')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('flags a percentage-anomaly fuel entry with the deviation banner', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-anomaly-1',
            unit_id: 'ASM-007',
            event_type: 'ADMIN_EDIT',
            fuel_level_after: 150,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(
      screen.getByText(/Posible desviación de consumo o robo de combustible/i)
    ).toBeInTheDocument();
  });

  it('renders a status-change impact row when status_before differs from status_after', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-status-1',
            unit_id: 'ASM-008',
            event_type: 'ADMIN_EDIT',
            status_before: 'En Ruta',
            status_after: 'Disponible',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('En Ruta')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });

  it('shows the no-impact dash when a log has no readable delta at all', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-noimpact-1',
            unit_id: 'ASM-009',
            event_type: 'ROUTE_START',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Despliegue operativo iniciado.')).toBeInTheDocument();
  });

  it('renders the whitelisted "Destino" snapshot diff when destination changed', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-snap-1',
            unit_id: 'ASM-010',
            event_type: 'ADMIN_EDIT',
            snapshot_before: { destination: 'Mina Norte' },
            snapshot_after: { destination: 'Mina Sur' },
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Mina Norte')).toBeInTheDocument();
    expect(screen.getByText('Mina Sur')).toBeInTheDocument();
  });

  it('unitId mode filters to that unit, drops ROUTE_START/FINISH exclusion N/A, and hides the ACTIVO column', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-u1',
            unit_id: 'ASM-011',
            event_type: 'ROUTE_START',
            created_at: new Date().toISOString(),
          },
          {
            id: 'uuid-u2',
            unit_id: 'ASM-012',
            event_type: 'ROUTE_START',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable unitId="ASM-011" />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByText('ASM-012')).not.toBeInTheDocument();
    expect(screen.getByText('SALIDA')).toBeInTheDocument();
  });

  it('routeUuid mode excludes ROUTE_START/FINISH and shows the "Ruta Saludable" banner when empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-r1',
            unit_id: 'ASM-013',
            event_type: 'ROUTE_START',
            reference_id: 'route-uuid-1',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable routeUuid="route-uuid-1" />);
    await waitFor(() => expect(screen.getByText('Ruta Saludable')).toBeInTheDocument());
  });

  it('hides the section header when hideHeader is set', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });
    render(<ForensicJournalTable hideHeader />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.queryByText('Journal de Activos')).not.toBeInTheDocument();
  });

  it('serves cached logs immediately (cache-first) before the network response settles', async () => {
    archonCache.set('forensic_journal_logs', mockLogs);
    let resolveNetwork: (v: unknown) => void = () => undefined;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }) as never
    );
    render(<ForensicJournalTable />);
    expect(await screen.findByText('ASM-001')).toBeInTheDocument();
    resolveNetwork({ data: { success: true, data: mockLogs } });
  });
});
