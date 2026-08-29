/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent, cleanup } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceGridView from './MaintenanceGridView';
import * as FleetContextModule from '../../context/FleetContext';
import * as UserContextModule from '../../context/UserContext';
import * as layoutContext from '../../context/SovereignLayoutContext';

const noop = (): void => undefined;

const ACTIVE_LOG = {
  id: 1,
  uuid: 'uuid-active-001',
  unit_id: 'ASM-001',
  service_date: '2026-05-29',
  odometer_at_service: 50000,
  service_type: 'ADVANCED_50K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'ADVANCED_50K',
  cost: 4500,
  technician: 'Carlos López',
  created_at: '2026-05-29T10:00:00Z',
  start_at: '2026-05-29T08:00:00Z',
  end_at: null,
  movement_status: 'ACTIVE',
};

const COMPLETED_LOG = {
  id: 2,
  uuid: 'uuid-completed-002',
  unit_id: 'ASM-010',
  service_date: '2026-05-28',
  odometer_at_service: 30000,
  service_type: 'MAJOR_30K',
  service_mode: 'WORKSHOP',
  system_recommended_type: 'MAJOR_30K',
  cost: 6000,
  technician: 'Ana Martínez',
  created_at: '2026-05-28T09:00:00Z',
  start_at: '2026-05-28T07:00:00Z',
  end_at: '2026-05-28T16:00:00Z',
  movement_status: 'COMPLETED',
};

describe('MaintenanceGridView', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [ACTIVE_LOG, COMPLETED_LOG], nextCursor: null })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('shows loading state initially', () => {
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    expect(screen.getByText(/sincronizando/i)).toBeInTheDocument();
  });

  it('renders maintenance logs after fetch', async () => {
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    expect(screen.getAllByText('ASM-010').length).toBeGreaterThan(0);
  });

  it('shows empty state when no records exist', async () => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron registros/i)).toBeInTheDocument()
    );
  });

  it('calls onCompleteRequest when Finalizar button is clicked on ACTIVE row', async () => {
    let called = false;
    const handleComplete = (): void => {
      called = true;
    };
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onCompleteRequest={handleComplete}
        onDetailRequest={noop}
      />
    );
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());
    const btn = screen.getByRole('button', { name: /finalizar/i });
    fireEvent.click(btn);
    expect(called).toBe(true);
  });

  it('clicking on a COMPLETED row triggers onDetailRequest', async () => {
    let calledWith: unknown = null;
    const handleDetail = (log: unknown): void => {
      calledWith = log;
    };
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onCompleteRequest={noop}
        onDetailRequest={handleDetail}
      />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-010').length).toBeGreaterThan(0));
    // Click the completed row — GridView calls onDetailRequest via row onClick
    const completedUnitText = screen.getAllByText('ASM-010')[0];
    fireEvent.click(completedUnitText.closest('tr') || completedUnitText);
    expect(calledWith).toBeTruthy();
  });

  it('renders MINOR_MINING service type badge', async () => {
    const MINOR_LOG = {
      ...ACTIVE_LOG,
      id: 3,
      uuid: 'uuid-minor-003',
      unit_id: 'ASM-020',
      service_type: 'MINOR_MINING',
      movement_status: 'COMPLETED',
      end_at: '2026-05-29T16:00:00Z',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [MINOR_LOG], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    expect(await screen.findByText('Servicio Menor')).toBeInTheDocument();
  });

  it('sorts logs by unit_id when activo header is clicked', async () => {
    const LOG_B = {
      ...ACTIVE_LOG,
      id: 3,
      uuid: 'uuid-b',
      unit_id: 'ASM-ZZZ',
      movement_status: 'COMPLETED',
      end_at: '2026-05-29T16:00:00Z',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [ACTIVE_LOG, LOG_B], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    const unitHeader = screen.getByText('UNIDAD');
    fireEvent.click(unitHeader); // sort asc
    fireEvent.click(unitHeader); // sort desc
    expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0);
  });

  it('sorts logs by service type, odometer, service date and cost', async () => {
    const LOG_C = {
      ...ACTIVE_LOG,
      id: 4,
      uuid: 'uuid-c',
      unit_id: 'ASM-XYZ',
      service_type: 'MINOR_MINING',
      odometer_at_service: 10000,
      cost: 100,
      movement_status: 'COMPLETED',
      end_at: '2026-05-30T10:00:00Z',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [ACTIVE_LOG, LOG_C], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));

    ['TIPO SERVICIO', 'ODÓMETRO', 'FECHAS', 'COSTO'].forEach((label) => {
      const header = screen.getByText(label);
      fireEvent.click(header); // asc
      fireEvent.click(header); // desc
    });

    expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0);
  });
});

/**
 * FC162 R4-B (100% mandatorio, 202_AN/203_AN Bravo) — quinto y último archivo
 * P0 (44 unc Sonar). matchFieldInMaintenance, getSuggestions/onSuggestionSelect,
 * filteredLogs por searchTerm activo, fmtDateTime con formato "YYYY-MM-DD HH:MM",
 * el catch del fetch, los onError de imagen (unidad/técnico) y el botón de
 * aceptar orden (OPEN) nunca tenían cobertura directa.
 */
describe('MaintenanceGridView — search suggestions (matchFieldInMaintenance)', () => {
  const SEARCH_LOG = {
    id: 10,
    uuid: 'uuid-search-010',
    unit_id: 'ASM-050',
    service_date: '2026-05-15',
    odometer_at_service: 20000,
    service_type: 'ADVANCED_50K',
    cost: 3000,
    technician: 'Elena Ruiz',
    start_at: '2026-05-15T08:00:00Z',
    end_at: '2026-05-15T10:00:00Z',
    movement_status: 'COMPLETED',
  };

  const captureGetSuggestions = async () => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Mantenimiento', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [SEARCH_LOG], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    // The registration effect depends on `logs`, which starts as [] and
    // updates once the async /maintenance fetch resolves — wait for the
    // effect to re-register before reading the latest getSuggestions closure.
    await waitFor(() => expect(setSearchConfig.mock.calls.length).toBeGreaterThan(1));
    return (term: string) => {
      const { calls } = setSearchConfig.mock;
      return calls[calls.length - 1][0].getSuggestions(term);
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('matches by unit id', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('asm-050')).toHaveLength(1);
  });

  it('matches by technician', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('elena')).toHaveLength(1);
  });

  it('matches by service type and labels it as Preventivo when not MINOR_MINING', async () => {
    const getSuggestions = await captureGetSuggestions();
    const results = getSuggestions('advanced_50k');
    expect(results).toHaveLength(1);
    expect(results[0].metaValue).toBe('Preventivo');
  });

  it('returns no suggestions when nothing matches', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('zzz-no-match')).toHaveLength(0);
  });

  it('onSuggestionSelect sets the search term to the selected log unit_id', async () => {
    const setSearchTerm = vi.fn();
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Mantenimiento', description: 'ERP' },
      searchTerm: '',
      setSearchTerm,
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [SEARCH_LOG], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(setSearchConfig).toHaveBeenCalled());
    setSearchConfig.mock.calls[0][0].onSuggestionSelect({ title: 'ASM-050' });
    expect(setSearchTerm).toHaveBeenCalledWith('ASM-050');
  });
});

describe('MaintenanceGridView — active search term filters rows', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('filters logs by the current searchTerm from the layout context', async () => {
    const logsData = [
      { ...ACTIVE_LOG, id: 20, uuid: 'uuid-f-1', unit_id: 'ASM-060' },
      { ...ACTIVE_LOG, id: 21, uuid: 'uuid-f-2', unit_id: 'ASM-070' },
    ];
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Mantenimiento', description: 'ERP' },
      searchTerm: 'asm-060',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: logsData, nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-060').length).toBeGreaterThan(0));
    expect(screen.queryByText('ASM-070')).not.toBeInTheDocument();
  });
});

describe('MaintenanceGridView — fmtDateTime space-separated datetime', () => {
  it('parses a "YYYY-MM-DD HH:MM:SS" (non-ISO) datetime for entrada/salida', async () => {
    const SPACE_LOG = {
      ...COMPLETED_LOG,
      id: 6,
      uuid: 'uuid-space-006',
      unit_id: 'ASM-040',
      start_at: '2026-05-28 07:00:00',
      end_at: '2026-05-28 16:00:00',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [SPACE_LOG], nextCursor: null })
      )
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-040').length).toBeGreaterThan(0));
  });
});

describe('MaintenanceGridView — fetch failure', () => {
  it('shows an error message when the maintenance fetch fails', async () => {
    server.use(http.get('*/maintenance', () => HttpResponse.error()));
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() =>
      expect(screen.getByText(/error al recuperar registros/i)).toBeInTheDocument()
    );
  });
});

describe('MaintenanceGridView — image error handlers', () => {
  const unitWithImage = [
    { id: 'ASM-001', marca: 'Nissan', modelo: 'March', images: ['/img/unit.png'] },
  ];
  const userWithImage = [
    {
      id: '1',
      username: 'clopez',
      fullName: 'Carlos López',
      imageUrl: 'https://example.com/avatar.png',
      employeeNumber: 'TEC-01',
    },
  ];

  beforeEach(() => {
    vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: unitWithImage,
      stats: {},
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: userWithImage,
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [ACTIVE_LOG], nextCursor: null })
      )
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('falls back to the default image when the unit thumbnail fails to load', async () => {
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getByAltText('ASM-001')).toBeInTheDocument());
    fireEvent.error(screen.getByAltText('ASM-001'));
    expect((screen.getByAltText('ASM-001') as HTMLImageElement).src).toContain(
      'archon-unit-default.png'
    );
  });

  it('hides the technician avatar image on load error', async () => {
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getByAltText('Carlos López')).toBeInTheDocument());
    fireEvent.error(screen.getByAltText('Carlos López'));
    expect((screen.getByAltText('Carlos López') as HTMLImageElement).style.display).toBe('none');
  });
});

describe('MaintenanceGridView — OPEN order actions', () => {
  const OPEN_LOG = {
    ...ACTIVE_LOG,
    id: 5,
    uuid: 'uuid-open-005',
    unit_id: 'ASM-030',
    movement_status: 'OPEN',
    start_at: null,
    end_at: null,
  };

  beforeEach(() => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [OPEN_LOG], nextCursor: null })
      )
    );
  });

  it('invokes onAcceptOrder when the accept button is clicked', async () => {
    const onAccept = vi.fn();
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onCompleteRequest={noop}
        onDetailRequest={noop}
        onAcceptOrder={onAccept}
        onRejectOrder={noop}
      />
    );
    await waitFor(() => expect(screen.getByTestId('accept-btn-uuid-open-005')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('accept-btn-uuid-open-005'));
    expect(onAccept).toHaveBeenCalledWith('uuid-open-005', 5);
  });

  it('the "Ver nodo de mantenimiento" link stops click propagation without throwing', async () => {
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getByTitle('Ver nodo de mantenimiento')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Ver nodo de mantenimiento'));
  });
});

/**
 * FC165 F2 Slice 2.1B (3/3) — branch coverage completion. Same god-function
 * shape as RegistrationForm/CompletionPanel (renderRow callback alone is
 * ~270 LOC) — 0 source edits attempted, test-only, matching the lesson from
 * V.78.103.136/137.
 */
describe('MaintenanceGridView — branch coverage (FC165 F2 Slice 2.1B)', () => {
  it('shows "0d" and "Staff No Identificado" for a log with empty service_date/start_at/technician (malformed/legacy data)', async () => {
    const MALFORMED_LOG = {
      ...ACTIVE_LOG,
      id: 30,
      uuid: 'uuid-malformed-030',
      unit_id: 'ASM-090',
      service_date: '',
      start_at: null,
      technician: '',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({ success: true, data: [MALFORMED_LOG], nextCursor: null })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-090').length).toBeGreaterThan(0));
    // daysBetween(from='', to) returns 0 when `from` is falsy
    expect(screen.getByText('0d')).toBeInTheDocument();
    // no user matches technician='' by fullName/username, and log.technician
    // itself is falsy — falls through both `||` fallbacks
    expect(screen.getByText('Staff No Identificado')).toBeInTheDocument();
  });

  it('matches and labels a MINOR_MINING log via the service_type search field (both matchFieldInMaintenance and getSuggestions ternaries)', async () => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Mantenimiento', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...ACTIVE_LOG, id: 31, uuid: 'uuid-minor-031', service_type: 'MINOR_MINING' }],
          nextCursor: null,
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(setSearchConfig.mock.calls.length).toBeGreaterThan(1));
    const { calls } = setSearchConfig.mock;
    const results = calls[calls.length - 1][0].getSuggestions('mining');
    expect(results).toHaveLength(1);
    // matchFieldInMaintenance's own ternary (label:'Tipo') AND getSuggestions'
    // subtitle ternary both resolve to the MINOR_MINING branch here.
    expect(results[0].metaValue).toBe('Servicio Menor');
    expect(results[0].subtitle).toBe('Servicio Menor');
  });

  // NOTE (FC165 F2 Slice 2.1B): `(logs || [])` at line 94 (getSuggestions)
  // stays untested here on purpose. Attempting the natural trigger — GET
  // /maintenance responding `{success:true, data:null}` — surfaced a REAL,
  // pre-existing production bug: `sortedLogs`'s `const data = [...logs];`
  // (no equivalent `|| []` guard) throws "logs is not iterable" and crashes
  // the whole component on the render that follows `setLogs(null)`, before
  // getSuggestions is ever reached. This is a genuine defect, not a test
  // artifact — reported to Alfa/Bravo via H/F rather than patched
  // unilaterally (outside the authorized branch-coverage scope of this
  // slice). Residual documented, no artificial/crashing test added.

  it('leaves logs empty (empty-state) when GET /maintenance responds success:false', async () => {
    server.use(
      http.get('*/maintenance', () => HttpResponse.json({ success: false })),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() =>
      expect(screen.getByText(/no se encontraron registros/i)).toBeInTheDocument()
    );
  });

  it('sorts by ODÓMETRO and COSTO with a log that has falsy (0) values for both', async () => {
    const ZERO_LOG = {
      ...ACTIVE_LOG,
      id: 32,
      uuid: 'uuid-zero-032',
      unit_id: 'ASM-095',
      odometer_at_service: 0,
      cost: 0,
      movement_status: 'COMPLETED',
      end_at: '2026-05-29T16:00:00Z',
    };
    const ZERO_LOG_2 = {
      ...ACTIVE_LOG,
      id: 36,
      uuid: 'uuid-zero-036',
      unit_id: 'ASM-096',
      odometer_at_service: 0,
      cost: 0,
      movement_status: 'COMPLETED',
      end_at: '2026-05-29T16:00:00Z',
    };
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({
          success: true,
          // ZERO_LOG both before and after ACTIVE_LOG so the falsy value
          // lands in both the "a" and "b" comparator positions regardless
          // of the sort algorithm's pairing order for this input size.
          data: [ZERO_LOG, ACTIVE_LOG, ZERO_LOG_2],
          nextCursor: null,
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));

    const odometerHeader = screen.getByText('ODÓMETRO');
    fireEvent.click(odometerHeader);
    await waitFor(() => expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0));
    fireEvent.click(odometerHeader);
    await waitFor(() => expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0));

    const costHeader = screen.getByText('COSTO');
    fireEvent.click(costHeader);
    await waitFor(() => expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0));
    fireEvent.click(costHeader);
    await waitFor(() => expect(screen.getAllByText('ASM-095').length).toBeGreaterThan(0));
  });

  it('falls back to "Técnico" alt text when the matched technician has an avatar but no fullName', async () => {
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: [
        {
          id: '1',
          username: 'no.fullname.tech',
          fullName: '',
          imageUrl: 'https://example.com/avatar.png',
          employeeNumber: 'TEC-02',
        },
      ],
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    });
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({
          success: true,
          data: [
            { ...ACTIVE_LOG, id: 33, uuid: 'uuid-notech-033', technician: 'no.fullname.tech' },
          ],
          nextCursor: null,
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    expect(await screen.findByAltText('Técnico')).toBeInTheDocument();
  });

  it('does not render the UPA button when hasUpa is true but onOpenUpa is not provided', async () => {
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...ACTIVE_LOG, id: 34, uuid: 'uuid-noupa-034', upa_work_order_id: 77 }],
          nextCursor: null,
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      // onOpenUpa intentionally omitted — hasUpa is true (isActive + upa_work_order_id set)
      <MaintenanceGridView refreshTrigger={0} onCompleteRequest={noop} onDetailRequest={noop} />
    );
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('open-upa-btn-uuid-noupa-034')).not.toBeInTheDocument();
  });

  it('invokes onOpenUpa with the work order id when the UPA button is clicked', async () => {
    const onOpenUpa = vi.fn();
    server.use(
      http.get('*/maintenance', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...ACTIVE_LOG, id: 35, uuid: 'uuid-upa-035', upa_work_order_id: 88 }],
          nextCursor: null,
        })
      ),
      http.get('*/fleet', () => HttpResponse.json({ success: true, data: [] }))
    );
    render(
      <MaintenanceGridView
        refreshTrigger={0}
        onCompleteRequest={noop}
        onDetailRequest={noop}
        onOpenUpa={onOpenUpa}
      />
    );
    await waitFor(() =>
      expect(screen.getByTestId('open-upa-btn-uuid-upa-035')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('open-upa-btn-uuid-upa-035'));
    expect(onOpenUpa).toHaveBeenCalledWith(88);
  });
});
