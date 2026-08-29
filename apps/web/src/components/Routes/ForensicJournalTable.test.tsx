import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../../test/testUtils';
import ForensicJournalTable from './ForensicJournalTable';
import api from '../../api/client';
import { archonCache } from '../../utils/archonCache';
import { FleetContext } from '../../context/FleetContext';

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

  it('cache-first (routeUuid mode) filters and sorts cached logs before the network settles', async () => {
    const cachedRouteLogs = [
      {
        id: 'c1',
        unit_id: 'ASM-020',
        event_type: 'ADMIN_EDIT',
        reference_id: 'route-cache-1',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'c2',
        unit_id: 'ASM-021',
        event_type: 'ROUTE_INCIDENT',
        reference_id: 'route-cache-1',
        created_at: '2026-01-02T00:00:00Z',
      },
      {
        id: 'c3',
        unit_id: 'ASM-022',
        event_type: 'ROUTE_START',
        reference_id: 'route-cache-1',
        created_at: '2026-01-03T00:00:00Z',
      },
      {
        id: 'c4',
        unit_id: 'ASM-023',
        event_type: 'ADMIN_EDIT',
        reference_id: 'other-route',
        created_at: '2026-01-04T00:00:00Z',
      },
    ];
    archonCache.set('forensic_journal_logs', cachedRouteLogs);
    let resolveNetwork: (v: unknown) => void = () => undefined;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }) as never
    );
    render(<ForensicJournalTable routeUuid="route-cache-1" />);
    expect(await screen.findByText('ASM-020')).toBeInTheDocument();
    expect(screen.getByText('ASM-021')).toBeInTheDocument();
    expect(screen.queryByText('ASM-022')).not.toBeInTheDocument();
    expect(screen.queryByText('ASM-023')).not.toBeInTheDocument();
    resolveNetwork({ data: { success: true, data: cachedRouteLogs } });
  });

  it('cache-first (unitId mode) filters cached logs to that unit before the network settles', async () => {
    const cachedUnitLogs = [
      {
        id: 'u1',
        unit_id: 'ASM-030',
        event_type: 'ADMIN_EDIT',
        description: 'Log Uno',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'u2',
        unit_id: 'ASM-030',
        event_type: 'ADMIN_EDIT',
        description: 'Log Dos',
        created_at: '2026-01-02T00:00:00Z',
      },
      {
        id: 'u3',
        unit_id: 'ASM-031',
        event_type: 'ADMIN_EDIT',
        description: 'Log Tres',
        created_at: '2026-01-03T00:00:00Z',
      },
    ];
    archonCache.set('forensic_journal_logs', cachedUnitLogs);
    let resolveNetwork: (v: unknown) => void = () => undefined;
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }) as never
    );
    render(<ForensicJournalTable unitId="ASM-030" />);
    expect(await screen.findByText('Log Uno')).toBeInTheDocument();
    expect(screen.getByText('Log Dos')).toBeInTheDocument();
    expect(screen.queryByText('Log Tres')).not.toBeInTheDocument();
    resolveNetwork({ data: { success: true, data: cachedUnitLogs } });
  });

  it('learns the observed fuel-tank ceiling from a 100%-fill log and flags a later refill above it', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'e1',
            unit_id: 'ASM-040',
            event_type: 'ADMIN_EDIT',
            fuel_level_after: 100,
            fuel_after: 20,
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'e2',
            unit_id: 'ASM-040',
            event_type: 'ADMIN_EDIT',
            fuel_level_after: 50,
            fuel_after: 25,
            created_at: '2026-01-02T00:00:00Z',
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    // e1 establishes the observed 20L ceiling for this unit; e2 refills to 25L (>20L+0.1)
    // without tripping the raw >100% check — only the observed-ceiling heuristic flags it.
    expect(
      screen.getByText(/Posible desviación de consumo o robo de combustible/i)
    ).toBeInTheDocument();
  });

  it('does not crash when a snapshot payload is malformed JSON', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-badjson-1',
            unit_id: 'ASM-050',
            event_type: 'ADMIN_EDIT',
            snapshot_before: '{not valid json',
            snapshot_after: { destination: 'Mina Norte' },
            description: 'Snapshot corrupto',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    // Malformed snapshot_before short-circuits the diff engine's safe-parse catch — the row
    // still renders without the "Destino" diff chip, and without crashing the table.
    expect(screen.getByText('Snapshot corrupto')).toBeInTheDocument();
    expect(screen.queryByText('Mina Norte')).not.toBeInTheDocument();
  });

  it('formats a numeric whitelisted snapshot value with one decimal place', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-numsnap-1',
            unit_id: 'ASM-051',
            event_type: 'ADMIN_EDIT',
            snapshot_before: { status: '10' },
            snapshot_after: { status: '25' },
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText('25.0')).toBeInTheDocument();
  });

  /**
   * FC165 F2 Slice 2.1C (2/5) — branch coverage completion. 22 uncovered
   * conditions (matches Alfa's census exactly). All test-only, 0 source
   * edits: sessionEvidence's normId fallbacks, the unitMap label/uuid
   * lookup keys, the theoretical-capacity anomaly check, the snapshot
   * diff engine's remaining branches, and the "no impact" chain's
   * present-but-equal fuel_level/fuel_amount cases. 5 residuals
   * documented, NOT purged: the whitelist object only carries
   * destination/status/additives_check, so the amount/fuel_liters_
   * loaded/reading/level prefix-suffix branches in formatVal (designed
   * for a broader whitelist) are structurally dead given the CURRENT
   * whitelist — but that whitelist lives inside a private render
   * closure, editing it would touch the god-component and trip Gate2
   * for no real behavior change.
   */
  it('treats a falsy unit_id as empty and skips it from sessionEvidence without throwing', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-nounit-1',
            unit_id: '',
            event_type: 'ADMIN_EDIT',
            description: 'Sin unidad resuelta',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Sin unidad resuelta')).toBeInTheDocument();
  });

  it('treats a missing /unit-logs data field as [] (no crash, empty state)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true } });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Sin registros forenses/i)).toBeInTheDocument();
  });

  it('resolves a unit via its uuid key (id normalizes to empty) and flags a theoretical-capacity anomaly', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-uuidkey-1',
            unit_id: 'REAL-UUID-123',
            event_type: 'ADMIN_EDIT',
            fuel_after: 90,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });

    const customFleet = {
      units: [{ id: 'ASM-', uuid: 'REAL-UUID-123', marca: 'X', modelo: 'Y', fuelTankCapacity: 80 }],
      loading: false,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    render(
      <FleetContext.Provider value={customFleet}>
        <ForensicJournalTable />
      </FleetContext.Provider>
    );
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    // fuel_after=90 > fuelTankCapacity=80 -> isTheoreticalAnomaly, only reachable
    // once the unit is resolved via its uuid key (id 'ASM-' normalizes to '').
    expect(
      screen.getByText(/Posible desviación de consumo o robo de combustible/i)
    ).toBeInTheDocument();
  });

  it('renders only the changed whitelisted fields, skipping an unchanged one and a non-whitelisted one', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-diffmix-1',
            unit_id: 'ASM-060',
            event_type: 'ADMIN_EDIT',
            snapshot_before: {
              destination: 'Same Place',
              status: 'X',
              additives_check: false,
              extra_field: 'ignored-before',
            },
            snapshot_after: {
              destination: 'Same Place',
              status: 'Y',
              additives_check: true,
              extra_field: 'ignored-after',
            },
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    // 'Estado' changed (X->Y) and 'Aditivos' changed (false->true) render;
    // 'Destino' (unchanged) and 'extra_field' (not whitelisted) do not.
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    expect(screen.getByText('NO')).toBeInTheDocument();
    expect(screen.getByText('SI')).toBeInTheDocument();
    expect(screen.queryByText('Same Place')).not.toBeInTheDocument();
    expect(screen.queryByText(/ignored-/)).not.toBeInTheDocument();
  });

  it('renders no diff chips when only non-whitelisted fields changed (whitelistedChanges is empty)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-nowhitelist-1',
            unit_id: 'ASM-061',
            event_type: 'ADMIN_EDIT',
            description: 'Sin cambios relevantes',
            snapshot_before: { destination: 'Same', other: 1 },
            snapshot_after: { destination: 'Same', other: 2 },
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Sin cambios relevantes')).toBeInTheDocument();
    expect(screen.queryByText('Same')).not.toBeInTheDocument();
  });

  it('parses a stringified snapshot_after and renders "—" for a null whitelisted before-value', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-strafter-1',
            unit_id: 'ASM-062',
            event_type: 'ADMIN_EDIT',
            description: 'Direccion corregida',
            snapshot_before: { destination: null },
            snapshot_after: JSON.stringify({ destination: 'Real Address' }),
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Real Address')).toBeInTheDocument();
    // the diff chip's "before" value renders the null-fallback dash
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the no-impact dash for a log where fuel_level and fuel_amount are present but unchanged', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 'uuid-flatline-1',
            unit_id: 'ASM-063',
            event_type: 'ADMIN_EDIT',
            description: 'Verificación de rutina',
            fuel_level_before: 50,
            fuel_level_after: 50,
            fuel_amount_before: 100,
            fuel_amount_after: 100,
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
    render(<ForensicJournalTable />);
    await waitFor(() =>
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('Verificación de rutina')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
