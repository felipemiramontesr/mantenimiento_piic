import React from 'react';
import { render, waitFor, act, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FleetProvider, useFleet } from './FleetContext';
import api from '../api/client';
import { archonCache } from '../utils/archonCache';

// 🔱 Senior Mocking Layer
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../hooks/usePermissions', () => ({
  default: (): object => ({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
    isOmnipotent: (): boolean => false,
  }),
}));

vi.mock('../utils/archonCache', () => ({
  archonCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const TestComponent = (): React.JSX.Element => {
  const { stats, loading, units } = useFleet();
  return (
    <div>
      <div data-testid="total">{stats.total}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="units-count">{units.length}</div>
    </div>
  );
};

// 🔱 FC162 R4-C — exposes the full context surface (startRoute/finishRoute/
// reportIncident/getUnitDetails) so tests can drive the action methods, not
// just read derived state.
const ActionsTestComponent = (): React.JSX.Element => {
  const { units, startRoute, finishRoute, reportIncident, getUnitDetails } = useFleet();
  const [detail, setDetail] = React.useState<string>('none');
  return (
    <div>
      <div data-testid="units-count">{units.length}</div>
      <div data-testid="detail">{detail}</div>
      <button
        onClick={async (): Promise<void> => {
          await startRoute({
            unitId: 'U-1',
            operatorId: 1,
            destination: 'Mina',
            origin: 'Base',
            startReading: 0,
          } as unknown as Parameters<typeof startRoute>[0]);
        }}
      >
        start
      </button>
      <button
        onClick={async (): Promise<void> => {
          await finishRoute('route-1', { endReading: 100 } as unknown as Parameters<
            typeof finishRoute
          >[1]);
        }}
      >
        finish
      </button>
      <button
        onClick={async (): Promise<void> => {
          await reportIncident('route-1', { description: 'x' } as unknown as Parameters<
            typeof reportIncident
          >[1]);
        }}
      >
        report
      </button>
      <button
        onClick={async (): Promise<void> => {
          const u = await getUnitDetails('U-1');
          setDetail(u ? u.id : 'null');
        }}
      >
        details
      </button>
    </div>
  );
};

const NoProviderComponent = (): React.JSX.Element => {
  useFleet();
  return <div>never renders</div>;
};

describe('FleetContext (World Class QA Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔱 PROTOCOLO CACHE-FIRST: Should load cache from archonCache on mount', async () => {
    const mockCache = [{ id: 'U-CACHE', status: 'Disponible', assetTypeId: 1 }];
    vi.mocked(archonCache.get).mockReturnValue(mockCache);

    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: mockCache } });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    // Wait for hydration to stabilize
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(archonCache.get).toHaveBeenCalledWith('fleet_units');
  });

  it('🔱 RESILIENCE: Should maintain cache data if API fails', async () => {
    const mockCache = [{ id: 'U-PERSISTENT', status: 'Disponible', assetTypeId: 1 }];
    vi.mocked(archonCache.get).mockReturnValue(mockCache);
    vi.mocked(api.get).mockRejectedValue(new Error('Internal Server Error 500'));

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    // Wait for sync attempt to finish
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Verify data was NOT cleared despite API failure
    expect(screen.getByTestId('total').textContent).toBe('1');
  });

  it('🔱 ATOMIC SYNC: Should update UI and Cache after successful fetch', async () => {
    vi.mocked(archonCache.get).mockReturnValue([]);
    const freshData = [{ id: 'U-FRESH', status: 'Disponible', assetTypeId: 1 }];
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: freshData } });
      if (url === '/incidents') return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });

    expect(archonCache.set).toHaveBeenCalledWith(
      'fleet_units',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'U-FRESH',
          status: 'Disponible',
          assetTypeId: 1,
        }),
      ])
    );
  });

  it('🔱 ANALYTICAL INTEGRITY: Calculates metrics for all asset types', async () => {
    const complexFleet = [
      { id: 'V1', assetTypeId: 1, status: 'Disponible' }, // Vehiculo
      { id: 'M1', assetTypeId: 2, status: 'En Mantenimiento' }, // Maquinaria
      { id: 'H1', assetTypeId: 3, status: 'Disponible' }, // Herramienta
    ];
    vi.mocked(archonCache.get).mockReturnValue(complexFleet);
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: complexFleet } });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    // This component only shows total, but it forces useMemo calculation
    expect(screen.getByTestId('total').textContent).toBe('3');
  });
});

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — the raw{data:[]}
 * normalization branch, the images JSON-string/malformed branches, the
 * MTBF/MTTR rounding, the stats aggregation catch, startRoute/finishRoute/
 * reportIncident, getUnitDetails (success+catch) and the no-provider throw
 * never had direct coverage.
 */
describe('FleetContext — transformUnits normalization edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(archonCache.get).mockReturnValue([]);
  });

  it('unwraps a doubly-nested {data:[...]} raw payload (transformUnits object branch)', async () => {
    // useSilkHydration already does `response.data?.data || response.data ||
    // []` — for transformUnits itself to receive an OBJECT with a `.data`
    // array (its own object-branch, not the Array.isArray fast path), the
    // API payload has to be nested one level deeper than usual.
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet')
        return Promise.resolve({ data: { data: { data: [{ id: 'NESTED', assetTypeId: 1 }] } } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('keeps a raw images array as-is', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ id: 'U-IMG-ARR', assetTypeId: 1, images: ['/img/a.png'] }] },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('parses a JSON-string images field into an array', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ id: 'U-IMG-STR', assetTypeId: 1, images: '["/img/b.png"]' }] },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('falls back to an empty array when the images field is malformed JSON', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ id: 'U-IMG-BAD', assetTypeId: 1, images: 'not-json' }] },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });
});

describe('FleetContext — stats aggregation (MTBF/MTTR + catch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(archonCache.get).mockReturnValue([]);
  });

  it('computes rounded MTBF/MTTR averages when units report positive hours', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          { id: 'U-1', assetTypeId: 1, status: 'Disponible', mtbfHours: 100, mttrHours: 2.34 },
          { id: 'U-2', assetTypeId: 1, status: 'Disponible', mtbfHours: 200, mttrHours: 3.66 },
        ],
      },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('2');
    });
  });

  it('falls back to initialStats and logs when aggregation throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    // `status` is also read by transformUnits itself (String() coercion at
    // normalization time), so poisoning it would throw too early, before the
    // stats aggregation's own try/catch is ever reached. `mtbfHours` is only
    // read inside computeAverages via Number(), so a valueOf() that throws
    // lands exactly in the target catch — transform copies it through
    // untouched (plain object spread, no coercion).
    const poisonUnit = {
      id: 'POISON',
      assetTypeId: 1,
      status: 'Disponible',
      mtbfHours: {
        valueOf: (): number => {
          throw new Error('boom');
        },
      },
    };
    vi.mocked(api.get).mockResolvedValue({ data: { data: [poisonUnit] } });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    // Wait for hydration to actually finish (not just the pre-fetch default
    // state, which also happens to read total='0') before asserting the
    // catch fired.
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔱 [Archon Stats] Aggregation Failure:',
        expect.any(Error)
      );
    });
    // initialStats.total stays 0 — the aggregation bailed out via catch.
    expect(screen.getByTestId('total').textContent).toBe('0');
    consoleSpy.mockRestore();
  });
});

describe('FleetContext — action methods (startRoute/finishRoute/reportIncident/getUnitDetails)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(archonCache.get).mockReturnValue([]);
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
  });

  it('startRoute posts the payload and refreshes units', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('start'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/routes/start', expect.any(Object));
    });
    // refreshUnits triggers a second /fleet fetch beyond the initial mount one.
    await waitFor(() => {
      expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('finishRoute patches the route and refreshes units', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('finish'));
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/routes/route-1/finish', expect.any(Object));
    });
  });

  it('reportIncident posts the incident and refreshes the incidents feed', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('report'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/routes/route-1/incidents', expect.any(Object));
    });
  });

  it('getUnitDetails hydrates and merges the full unit on success', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet/U-1')
        return Promise.resolve({
          data: { data: { id: 'U-1', assetTypeId: 1, images: ['/x.png'] } },
        });
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('details'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail').textContent).toBe('U-1');
    });
  });

  it('getUnitDetails returns null and logs on a rejected fetch', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet/U-1') return Promise.reject(new Error('not found'));
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByText('details'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail').textContent).toBe('null');
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch unit details'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

/**
 * FC165 F2B2.1, Slice 2.1A — 26 uncovered_conditions never had direct
 * coverage: the transformUnits `[]` fallback, several optional numeric
 * fields (capacidadCarga/fuelTankCapacity/initial+lastFuelLevel), the
 * MICHELIN tireBrandId fallback, hasPermission('route:view')=false,
 * the mid-fetch `unitsSyncing` loading branch, status-absent aggregation
 * paths, and getUnitDetails' setUnits merge on a unit already in state.
 */
describe('FleetContext — branch coverage (FC165 F2B2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(archonCache.get).mockReturnValue([]);
  });

  it('transformUnits falls back to [] when the raw payload is neither an array nor an object with a .data array', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: 'not-an-object-or-array' });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('total').textContent).toBe('0');
  });

  it('normalizes capacidadCarga/fuelTankCapacity/initialFuelLevel/lastFuelLevel when present, and the MICHELIN tireBrandId fallback when tireBrand is absent', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            id: 'U-RICH',
            assetTypeId: 1,
            status: 'Disponible',
            capacidad_carga: 1200,
            fuel_tank_capacity: 80,
            initial_fuel_level: 90,
            last_fuel_level: 40,
            tireBrandId: 243,
          },
        ],
      },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('does not fetch incidents when the actor lacks route:view, and openIncidents/aggregation still resolve', async () => {
    vi.doMock('../hooks/usePermissions', () => ({
      default: (): object => ({
        hasPermission: (perm: string): boolean => perm !== 'route:view',
        hasAnyPermission: (): boolean => true,
        isOmnipotent: (): boolean => false,
      }),
    }));
    vi.resetModules();
    const { FleetProvider: IsolatedProvider, useFleet: useIsolatedFleet } = await import(
      './FleetContext'
    );
    const Probe = (): React.JSX.Element => {
      const { stats, loading } = useIsolatedFleet();
      return (
        <div>
          <div data-testid="loading">{loading.toString()}</div>
          <div data-testid="open">{stats.openIncidents}</div>
        </div>
      );
    };
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    await act(async () => {
      render(
        <IsolatedProvider>
          <Probe />
        </IsolatedProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('open').textContent).toBe('0');
    expect(api.get).not.toHaveBeenCalledWith('/incidents');
    vi.doUnmock('../hooks/usePermissions');
  });

  it('reports loading=true synchronously while the initial fetch is still in flight', async () => {
    // sync() only shows loading when !isSilent && prev.length===0 -- and
    // isSilent comes from `!!archonCache.get(key)`, so an empty-array cache
    // (truthy, per the default beforeEach mock) triggers a SILENT sync.
    // A falsy cache (no prior data at all) is required for the real
    // loading-spinner path.
    vi.mocked(archonCache.get).mockReturnValue(undefined);
    let resolveFetch: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(
      <FleetProvider>
        <TestComponent />
      </FleetProvider>
    );

    // The sync-triggering effect flips isSyncing before the fetch itself
    // resolves -- wait for React to flush that state update rather than
    // asserting synchronously right after render().
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    await act(async () => {
      resolveFetch({ data: { data: [] } });
    });
  });

  it('treats a unit with no status field as "available" (empty-string fallback) inside both the top-level and per-category aggregation', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'U-NOSTATUS', assetTypeId: 2 }],
      },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('getUnitDetails returns null without touching state when the API response has no .data payload', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet/U-EMPTY') return Promise.resolve({ data: {} });
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const EmptyDetailButton = (): React.JSX.Element => {
      const { getUnitDetails } = useFleet();
      const [detail, setDetail] = React.useState('none');
      return (
        <div>
          <div data-testid="empty-detail">{detail}</div>
          <button
            onClick={async (): Promise<void> => {
              const u = await getUnitDetails('U-EMPTY');
              setDetail(u ? u.id : 'null');
            }}
          >
            fetch-empty
          </button>
        </div>
      );
    };
    render(
      <FleetProvider>
        <EmptyDetailButton />
      </FleetProvider>
    );
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await act(async () => {
      fireEvent.click(screen.getByText('fetch-empty'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('empty-detail').textContent).toBe('null');
    });
  });

  it('getUnitDetails merges hydrated images into the matching unit already in state, leaving other units untouched', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/fleet')
        return Promise.resolve({
          data: {
            data: [
              { id: 'U-1', assetTypeId: 1, status: 'Disponible' },
              { id: 'U-2', assetTypeId: 1, status: 'Disponible' },
            ],
          },
        });
      if (url === '/fleet/U-1')
        return Promise.resolve({
          data: { data: { id: 'U-1', assetTypeId: 1, images: ['/hydrated.png'] } },
        });
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <FleetProvider>
        <ActionsTestComponent />
      </FleetProvider>
    );
    await waitFor(() => expect(screen.getByTestId('units-count').textContent).toBe('2'));

    await act(async () => {
      fireEvent.click(screen.getByText('details'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('detail').textContent).toBe('U-1');
    });
  });

  it('falls back to [] when a JSON-string images field parses to a non-array value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ id: 'U-IMG-OBJ', assetTypeId: 1, images: '{"not":"an-array"}' }] },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });

  it('falls back to S/D or General for every label field when the id is absent from its map', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            id: 'U-UNMAPPED',
            status: 'Disponible',
            assetTypeId: 999,
            fuelTypeId: 999,
            departmentId: 999,
            engineTypeId: 999,
          },
        ],
      },
    });

    await act(async () => {
      render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('1');
    });
  });
});

describe('FleetContext — useFleet without a provider', () => {
  it('throws when used outside of a FleetProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    expect(() => render(<NoProviderComponent />)).toThrow(
      'useFleet must be used within a FleetProvider'
    );
    consoleSpy.mockRestore();
  });
});
