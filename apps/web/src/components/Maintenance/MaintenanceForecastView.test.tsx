/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, fireEvent, cleanup } from '../../test/testUtils';
import server from '../../test/server';
import MaintenanceForecastView from './MaintenanceForecastView';
import * as FleetContextModule from '../../context/FleetContext';
import * as layoutContext from '../../context/SovereignLayoutContext';

const noop = (): void => undefined;

// ── Fixture rows ─────────────────────────────────────────────────────────────

const CRITICAL_ROW = {
  unitId: 'ASM-001',
  marca: 'Nissan',
  modelo: 'March',
  departamento: 'MINA',
  currentOdometer: 49800,
  dailyUsageAvg: 120,
  nextKmReading: 50000,
  kmRemaining: 200,
  nextServiceDate: '2026-05-30',
  daysUntilService: 2,
  triggerType: 'KM',
  projectedOdometer: 50000,
  projectedServiceType: 'ADVANCED_50K',
  urgency: 'CRITICAL',
};

const WARNING_ROW = {
  unitId: 'ASM-010',
  marca: 'Toyota',
  modelo: 'Hilux',
  departamento: 'AGENCIA',
  currentOdometer: 28500,
  dailyUsageAvg: 80,
  nextKmReading: 30000,
  kmRemaining: 1500,
  nextServiceDate: '2026-06-10',
  daysUntilService: 15,
  triggerType: 'KM',
  projectedOdometer: 30000,
  projectedServiceType: 'MAJOR_30K',
  urgency: 'WARNING',
};

const OK_ROW = {
  unitId: 'ASM-020',
  marca: 'Ford',
  modelo: 'Ranger',
  departamento: 'MINA',
  currentOdometer: 5000,
  dailyUsageAvg: 30,
  nextKmReading: 10000,
  kmRemaining: 5000,
  nextServiceDate: '2026-09-01',
  daysUntilService: 120,
  triggerType: 'DATE',
  projectedOdometer: 10000,
  projectedServiceType: 'BASIC_10K',
  urgency: 'OK',
};

const MINE_ROW = {
  unitId: 'ASM-030',
  marca: 'Caterpillar',
  modelo: '420E',
  departamento: 'MINA',
  currentOdometer: 15200,
  dailyUsageAvg: 50,
  nextKmReading: 15000,
  kmRemaining: -200,
  nextServiceDate: '2026-05-25',
  daysUntilService: -3,
  triggerType: 'KM',
  projectedOdometer: 15000,
  projectedServiceType: 'MINOR_MINING',
  urgency: 'CRITICAL',
};

const renderForecast = (): void => {
  render(<MaintenanceForecastView onScheduleRequest={noop} />);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MaintenanceForecastView', () => {
  beforeEach(() => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  // ── Loading / empty states ─────────────────────────────────────────────────
  it('shows loading skeleton before data arrives', () => {
    server.use(
      http.get(
        '*/maintenance/forecast',
        () => new Promise(() => undefined) // never resolves
      )
    );
    renderForecast();
    expect(screen.getByText('Calculando pronósticos de flotilla...')).toBeInTheDocument();
  });

  it('shows empty message when API returns no units', async () => {
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('NO SE ENCONTRARON UNIDADES ACTIVAS')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    server.use(http.get('*/maintenance/forecast', () => HttpResponse.error()));
    renderForecast();
    await waitFor(() => {
      expect(
        screen.getByText('Error al recuperar pronósticos de mantenimiento.')
      ).toBeInTheDocument();
    });
  });

  // ── Urgency badges ─────────────────────────────────────────────────────────
  it('renders CRITICAL badge for an overdue unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });
  });

  it('renders WARNING (Próximo) badge for a near-due unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Próximo')).toBeInTheDocument();
    });
  });

  it('renders OK (Al Día) badge for a healthy unit', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Al Día')).toBeInTheDocument();
    });
  });

  // ── Service type labels ────────────────────────────────────────────────────
  it('renders "Avanzado 50K - 60K" label for ADVANCED_50K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Avanzado 50K - 60K')).toBeInTheDocument();
    });
  });

  it('renders "Mayor 30K - 40K" label for MAJOR_30K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Mayor 30K - 40K')).toBeInTheDocument();
    });
  });

  it('renders "Básico 10K" label for BASIC_10K service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Básico 10K')).toBeInTheDocument();
    });
  });

  it('renders "Servicio Menor" label for MINOR_MINING service type', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [MINE_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Servicio Menor')).toBeInTheDocument();
    });
  });

  // ── Date formatting ─────────────────────────────────────────────────────────
  it('formats next service date as DD/MM/YYYY', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    // CRITICAL_ROW.nextServiceDate = '2026-05-30' → should display '30/05/2026'
    await waitFor(() => {
      expect(screen.getByText('30/05/2026')).toBeInTheDocument();
    });
  });

  // ── Trigger type indicator ─────────────────────────────────────────────────
  it('shows "Kilometraje" trigger for KM-triggered forecast', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Kilometraje')).toBeInTheDocument();
    });
  });

  it('shows "Fecha" trigger for DATE-triggered forecast', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Fecha')).toBeInTheDocument();
    });
  });

  // ── Unit info rendering ────────────────────────────────────────────────────
  it('renders unit ID in the row', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-010')).toBeInTheDocument();
    });
  });

  it('renders unit brand and model', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    });
  });

  it('renders department badge', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('AGENCIA')).toBeInTheDocument();
    });
  });

  // ── Multiple rows ──────────────────────────────────────────────────────────
  it('renders all three urgency levels when data contains mixed rows', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW, OK_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('Crítico')).toBeInTheDocument();
      expect(screen.getByText('Próximo')).toBeInTheDocument();
      expect(screen.getByText('Al Día')).toBeInTheDocument();
    });
  });

  it('renders a "Programar" button for each row', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Programar/i });
      expect(buttons).toHaveLength(2);
    });
  });

  // ── Unit image from FleetContext ───────────────────────────────────────────
  it('renders placeholder image when unit has no images in FleetContext', async () => {
    // MockFleetContext unit ASM-001 has no images array
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      const placeholder = screen.getByAltText('Archon Unit Placeholder');
      expect(placeholder).toBeInTheDocument();
    });
  });

  // ── Odometer display ───────────────────────────────────────────────────────
  it('renders odometer reading with km suffix', async () => {
    server.use(
      http.get('*/maintenance/forecast', () => HttpResponse.json({ success: true, data: [OK_ROW] }))
    );
    renderForecast();
    // OK_ROW has currentOdometer=5000 and kmRemaining=5000 — both cells show "5,000 km"
    await waitFor(() => {
      const matches = screen.getAllByText(/5[.,]000 km/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Out-of-domain resilience (FC 071 F2 — root-cause mechanism) ────────────
  // Terreno: una fila con urgency/projectedServiceType fuera de los mapas
  // (URGENCY_META/SERVICE_BADGE) reventaba el render (`undefined.bg`) y, sin
  // ErrorBoundary, React desmontaba el root completo (pantalla blanca — CI run 4).
  it('renders row with fallback styling instead of crashing on out-of-domain urgency/serviceType (FC 071)', async () => {
    const OUT_OF_DOMAIN_ROW = {
      ...WARNING_ROW,
      unitId: 'ASM-666',
      projectedServiceType: 'FUTURE_TYPE_X',
      urgency: 'MEDIUM',
    };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [OUT_OF_DOMAIN_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-666')).toBeInTheDocument();
    });
    // El valor desconocido se muestra tal cual (fallback), nunca crashea
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('FUTURE_TYPE_X')).toBeInTheDocument();
  });

  it('renders mixed valid and out-of-domain rows without unmounting the valid ones (FC 071)', async () => {
    const OUT_OF_DOMAIN_ROW = { ...OK_ROW, unitId: 'ASM-667', urgency: 'UNKNOWN_LEVEL' };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, OUT_OF_DOMAIN_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeInTheDocument();
      expect(screen.getByText('ASM-667')).toBeInTheDocument();
    });
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 67,333 ──

  it('shows the em-dash placeholder for an empty (falsy) out-of-domain urgency value', async () => {
    const EMPTY_URGENCY_ROW = { ...WARNING_ROW, unitId: 'ASM-668', urgency: '' };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [EMPTY_URGENCY_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-668')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the singular "día" (no trailing s) when daysUntilService is exactly 1', async () => {
    const ONE_DAY_ROW = { ...WARNING_ROW, unitId: 'ASM-669', daysUntilService: 1 };
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [ONE_DAY_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-669')).toBeInTheDocument());
    expect(screen.getByText('1 día')).toBeInTheDocument();
  });
});

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — matchFieldInForecast,
 * getSuggestions/onSuggestionSelect, sort por campo string/numérico,
 * filtered por searchTerm activo y el onError de la miniatura de unidad
 * nunca tenían cobertura directa.
 */
describe('MaintenanceForecastView — search suggestions (matchFieldInForecast)', () => {
  const captureGetSuggestions = async () => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Pronóstico', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW] })
      )
    );
    renderForecast();
    // The registration effect depends on `data`, which starts as [] and
    // updates once the async /maintenance/forecast fetch resolves — wait for
    // the effect to re-register before reading the latest getSuggestions.
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
    expect(getSuggestions('asm-001')).toHaveLength(1);
  });

  it('matches by departamento', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('agencia')).toHaveLength(1);
  });

  it('matches by projected service type label', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('avanzado')).toHaveLength(1);
  });

  it('returns no suggestions when nothing matches', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('zzz-no-match')).toHaveLength(0);
  });

  it('onSuggestionSelect sets the search term to the selected row unit_id', async () => {
    const setSearchTerm = vi.fn();
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Pronóstico', description: 'ERP' },
      searchTerm: '',
      setSearchTerm,
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(setSearchConfig).toHaveBeenCalled());
    setSearchConfig.mock.calls[0][0].onSuggestionSelect({ title: 'ASM-001' });
    expect(setSearchTerm).toHaveBeenCalledWith('ASM-001');
  });
});

describe('MaintenanceForecastView — sorting', () => {
  it('sorts by a string field (UNIDAD) and a numeric field (ODÓMETRO)', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());

    const unitHeader = screen.getByText('UNIDAD');
    fireEvent.click(unitHeader); // asc, string comparator
    fireEvent.click(unitHeader); // desc, string comparator

    const odoHeader = screen.getByText('ODÓMETRO');
    fireEvent.click(odoHeader); // asc, numeric comparator
    fireEvent.click(odoHeader); // desc, numeric comparator

    expect(screen.getAllByText(/ASM-/).length).toBeGreaterThan(0);
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 225,226,230,231 ──

  it('sorts by TIPO PROYECTADO using the SERVICE_WEIGHT numeric lookup', async () => {
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, OK_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());

    // ADVANCED_50K (weight 5) vs BASIC_10K (weight 2) — exercises the
    // f==='projectedServiceType' branch of the sort comparator (not the
    // plain a[f]/b[f] path already covered by UNIDAD/ODÓMETRO).
    fireEvent.click(screen.getByText('TIPO PROYECTADO'));
    expect(screen.getAllByText(/ASM-/).length).toBe(2);
  });

  it('falls back to an empty string when sorting a string field with a null value', async () => {
    // 3 rows (not 2) — Array.prototype.sort with only 2 elements can call the
    // comparator with a fixed/skipped argument order; 3+ elements with the
    // null-value row in the middle forces multiple pairwise comparisons so
    // the `valA ?? ''` / `valB ?? ''` fallback actually gets exercised on
    // both sides, not just proven not to crash.
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({
          success: true,
          data: [WARNING_ROW, { ...CRITICAL_ROW, unitId: null }, OK_ROW],
        })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-010')).toBeInTheDocument());

    // UNIDAD is a sortable string field — with one row's value null, the
    // comparator's `valA ?? ''` / `valB ?? ''` fallback must fire instead of
    // crashing on localeCompare. The null-id row renders no visible unitId
    // text, so only 2 (not 3) 'ASM-' matches remain after sorting.
    expect(() => fireEvent.click(screen.getByText('UNIDAD'))).not.toThrow();
    expect(screen.getAllByText(/ASM-/).length).toBe(2);
  });
});

describe('MaintenanceForecastView — active search term filters rows', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('filters rows by the current searchTerm from the layout context', async () => {
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Pronóstico', description: 'ERP' },
      searchTerm: 'asm-001',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW, WARNING_ROW] })
      )
    );
    renderForecast();
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeInTheDocument());
    expect(screen.queryByText('ASM-010')).not.toBeInTheDocument();
  });
});

describe('MaintenanceForecastView — unit thumbnail image error', () => {
  beforeEach(() => {
    vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: [{ id: 'ASM-001', marca: 'Nissan', modelo: 'March', images: ['/img/unit.png'] }],
      stats: {},
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });
    server.use(
      http.get('*/maintenance/forecast', () =>
        HttpResponse.json({ success: true, data: [CRITICAL_ROW] })
      )
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('falls back to the default image when the unit thumbnail fails to load', async () => {
    renderForecast();
    await waitFor(() => expect(screen.getByAltText('ASM-001')).toBeInTheDocument());
    fireEvent.error(screen.getByAltText('ASM-001'));
    expect(screen.getByAltText('ASM-001').getAttribute('src')).toBe('/img/archon-unit-default.png');
  });
});
