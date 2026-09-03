import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '../../../test/testUtils';
import ArchonGeoSelector from './ArchonGeoSelector';
import api from '../../../api/client';
import { archonCache } from '../../../utils/archonCache';

/**
 * FC162 F2 — ArchonGeoSelector.tsx had zero test coverage (excluded from
 * Vitest AND never exercised — `RouteAssignmentForm.test.tsx` mocks this
 * whole component out). Covers the cascading Estado→Municipio→Colonia flow,
 * the archonCache short-circuit, value hydration, and the originNode layout.
 */

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const STATES = [
  { id: 1, name: 'Zacatecas' },
  { id: 2, name: 'Durango' },
];
const MUNICIPALITIES = [{ id: 10, name: 'Fresnillo' }];
const NEIGHBORHOODS = [{ id: 100, name: 'Centro', postalCode: '99000' }];

beforeEach(() => {
  vi.clearAllMocks();
  archonCache.clear();
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/geolocation/states') return { data: { data: STATES } };
    // Order matters: '/geolocation/municipalities/:id/neighborhoods' contains
    // '/municipalities' as a substring, so the neighborhoods checks must win first.
    if (url.includes('/neighborhoods')) return { data: { data: NEIGHBORHOODS } };
    if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
    throw new Error(`unmocked: ${url}`);
  });
});

describe('ArchonGeoSelector', () => {
  it('renders Estado/Municipio/Colonia in a 3-column layout when no originNode is given', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/geolocation/states'));
    expect(screen.getByText('Buscar Estado...')).toBeInTheDocument();
    expect(screen.getByText('Buscar Municipio...')).toBeInTheDocument();
    expect(screen.getByText('Buscar Colonia...')).toBeInTheDocument();
  });

  it('renders a 2-column Destino layout with the given originNode', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} originNode={<div>Origin Field</div>} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/geolocation/states'));
    expect(screen.getByText('Origin Field')).toBeInTheDocument();
    expect(screen.getByText('Destino')).toBeInTheDocument();
  });

  it('caches states after the first load and skips the network on a fresh mount', async () => {
    const { unmount } = render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/geolocation/states'));
    unmount();
    vi.mocked(api.get).mockClear();
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    expect(api.get).not.toHaveBeenCalledWith('/geolocation/states');
  });

  it('selecting an Estado loads its municipalities and resets the selection upstream', async () => {
    const onChange = vi.fn();
    render(<ArchonGeoSelector onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));

    expect(onChange).toHaveBeenCalledWith(undefined, '');
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );
  });

  it('selecting a Colonia builds "Colonia, Municipio, Estado" and calls onChange with it', async () => {
    const onChange = vi.fn();
    render(<ArchonGeoSelector onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    fireEvent.click(await screen.findByText('Centro'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(100, 'Centro, Fresnillo, Zacatecas'));
  });

  it('hydrates Estado/Municipio/Colonia from a pre-existing value prop', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url === '/geolocation/neighborhoods/100') {
        return {
          data: { id: 100, name: 'Centro', postalCode: '99000', stateId: 1, municipalityId: 10 },
        };
      }
      if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector value={100} onChange={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/geolocation/neighborhoods/100'));
    await waitFor(() => expect(screen.getByText('Centro')).toBeInTheDocument());
  });

  it('typing in an open Combobox debounces a filtered search against the loaded states', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'Duran' } });
    await waitFor(() => expect(screen.queryByText('Zacatecas')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
    expect(screen.getByText('Durango')).toBeInTheDocument();
  });

  it('clicking the trigger again closes an already-open dropdown', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    const trigger = screen.getByText('Buscar Estado...');
    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('a Colonia option without a postalCode renders with no secondary (CP) text', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/neighborhoods')) return { data: { data: [{ id: 100, name: 'Centro' }] } };
      if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));
    fireEvent.click(screen.getByText('Buscar Colonia...'));

    expect(await screen.findByText('Centro')).toBeInTheDocument();
    expect(screen.queryByText(/CP:/)).not.toBeInTheDocument();
  });

  it('the Municipio and Colonia selectors stay disabled until their parent is selected', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Municipio...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Municipio...'));
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('disabled=true prevents any Combobox from opening', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} disabled />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });
});

/**
 * FC163 F1-REG Gate3 (222_AN/Sonar 34-line audit) — ComboboxTrigger and
 * ComboboxOptionItem's onKeyDown (Enter/Space) had no dedicated coverage;
 * only their onClick twins were ever exercised.
 */
describe('ArchonGeoSelector — keyboard activation (FC163 F1-REG Gate3)', () => {
  it('Enter on the Estado trigger opens the dropdown (keyboard parity with click)', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByText('Buscar Estado...'), { key: 'Enter' });
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('Space on the Estado trigger opens the dropdown', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByText('Buscar Estado...'), { key: ' ' });
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('Enter on an open option selects it (ComboboxOptionItem keyboard path)', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    const option = await screen.findByText('Zacatecas');
    fireEvent.keyDown(option, { key: 'Enter' });
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );
  });

  it('a non-activation key on the trigger does not open the dropdown', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByText('Buscar Estado...'), { key: 'Tab' });
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('a non-activation key on an open option does not select it', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    const option = await screen.findByText('Zacatecas');
    fireEvent.keyDown(option, { key: 'Tab' });
    // sigue abierto, sin seleccion -- el input de busqueda todavia esta ahi
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/geolocation/states/1/municipalities');
  });
});

/**
 * FC162 R4-C (100% mandatorio, 204_AN/206_AN Bravo) — the outside-click
 * close handler, the search input's own stopPropagation click, the three
 * network-failure catch blocks (municipalities load, neighborhood hydration,
 * handleNeighborhoodChange's own duplicate lookup), and the "parent cleared"
 * early-return branches of searchMunicipalities/searchNeighborhoods never
 * had direct coverage.
 */
describe('ArchonGeoSelector — outside click and search input interactions', () => {
  it('closes an open dropdown when clicking outside the container', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByPlaceholderText('Buscar...')).not.toBeInTheDocument();
  });

  it('clicking the search input itself does not close the dropdown (stopPropagation)', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.click(searchInput);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('a mousedown inside the open container does not close it (useClickOutside)', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.mouseDown(searchInput);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });
});

describe('ArchonGeoSelector — network failure catch blocks', () => {
  it('logs and swallows the error when searchStates itself throws (malformed state entry)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      // A state entry missing `name` makes `.toLowerCase()` throw inside the
      // debounced onSearch — a realistic malformed-API-payload case, not an
      // artificially injected mock error.
      if (url === '/geolocation/states') return { data: { data: [{ id: 1 }] } };
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'zac' } });

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled(), { timeout: 1000 });
    consoleSpy.mockRestore();
  });

  it('logs when loading municipalities for a newly selected state fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/municipalities')) throw new Error('boom');
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load municipalities', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });

  it('logs when hydrating a pre-existing value fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url === '/geolocation/neighborhoods/100') throw new Error('boom');
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector value={100} onChange={vi.fn()} />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to hydrate neighborhood details',
        expect.any(Error)
      )
    );
    consoleSpy.mockRestore();
  });

  it('falls back to the raw neighborhood name when the destination-string lookup fails', async () => {
    const onChange = vi.fn();
    let municipalitiesCallCount = 0;
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/neighborhoods')) return { data: { data: NEIGHBORHOODS } };
      if (url.includes('/municipalities')) {
        municipalitiesCallCount += 1;
        // 1st call: the state-selection effect (must succeed so Municipio
        // enables). 2nd call: handleNeighborhoodChange's own duplicate
        // lookup — forced to fail to exercise its fallback catch.
        if (municipalitiesCallCount > 1) throw new Error('boom');
        return { data: { data: MUNICIPALITIES } };
      }
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() => expect(municipalitiesCallCount).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    fireEvent.click(await screen.findByText('Centro'));

    // Fallback: raw "Centro" instead of the composed "Centro, Fresnillo, Zacatecas".
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(100, 'Centro'));
  });
});

describe('ArchonGeoSelector — parent-cleared search early returns', () => {
  afterEach(() => {
    cleanup();
  });

  it('searchNeighborhoods returns no options once a different Estado resets the Municipio selection', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    // Open Colonia (now enabled) before resetting the state upstream.
    fireEvent.click(screen.getByText('Buscar Colonia...'));
    await waitFor(() => expect(screen.getByText('Centro')).toBeInTheDocument());

    // Selecting a different Estado resets selectedMunicipality to undefined
    // (handleStateChange) while Colonia's dropdown is still open — its
    // search identity changes and re-runs with no municipality selected.
    fireEvent.click(screen.getByText('Zacatecas'));
    fireEvent.click(await screen.findByText('Durango'));

    await waitFor(() => expect(screen.queryByText('Centro')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it('searchMunicipalities returns no options once the controlled value is cleared upstream', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url === '/geolocation/neighborhoods/100') {
        return {
          data: { id: 100, name: 'Centro', postalCode: '99000', stateId: 1, municipalityId: 10 },
        };
      }
      if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
      throw new Error(`unmocked: ${url}`);
    });

    const ControlledWrapper = (): React.JSX.Element => {
      const [value, setValue] = React.useState<number | undefined>(100);
      return (
        <div>
          <button type="button" onClick={(): void => setValue(undefined)}>
            clear-value
          </button>
          <ArchonGeoSelector value={value} onChange={vi.fn()} />
        </div>
      );
    };

    render(<ControlledWrapper />);
    await waitFor(() => expect(screen.getByText('Centro')).toBeInTheDocument());
    // Hydration already resolved Municipio's value to "Fresnillo" — its
    // trigger shows that label instead of the "Buscar Municipio..."
    // placeholder.
    await waitFor(() => expect(screen.getByText('Fresnillo')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Fresnillo'));
    await waitFor(() => expect(screen.getAllByText('Fresnillo').length).toBeGreaterThan(1));

    fireEvent.click(screen.getByText('clear-value'));

    await waitFor(() => expect(screen.queryByText('Fresnillo')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });
});

/**
 * The Combobox's onSearch is invoked from a 300ms debounce, and its cleanup
 * (`clearTimeout`) fires on unmount/dependency-change — most existing
 * interactions above resolve via `initialOptions` well before that debounce
 * ever elapses, so the debounced fetch itself (its success return AND its
 * own catch) never actually runs. These tests explicitly wait out the real
 * debounce window to force it.
 */
const waitForDebounce = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 350);
    });
  });
};

describe('ArchonGeoSelector — debounced search completion', () => {
  it('logs when the initial states load fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockRejectedValue(new Error('boom'));

    render(<ArchonGeoSelector onChange={vi.fn()} />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load states', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });

  it('resolves the full states list once the debounced empty-term search completes', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    await waitForDebounce();

    expect(screen.getByText('Zacatecas')).toBeInTheDocument();
    expect(screen.getByText('Durango')).toBeInTheDocument();
  });

  it('resolves municipalities via the debounced search-with-params call', async () => {
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    await waitForDebounce();

    expect(api.get).toHaveBeenCalledWith(
      '/geolocation/states/1/municipalities',
      expect.objectContaining({ params: { search: '' } })
    );
    expect(screen.getByText('Fresnillo')).toBeInTheDocument();
  });

  it('logs when the debounced municipalities search-with-params call fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation(
      async (url: string, config?: { params?: { search: string } }) => {
        if (url === '/geolocation/states') return { data: { data: STATES } };
        if (url.includes('/municipalities')) {
          // The state-selection effect calls this URL with no config; only
          // the debounced onSearch call passes `params`.
          if (config?.params) throw new Error('boom');
          return { data: { data: MUNICIPALITIES } };
        }
        throw new Error(`unmocked: ${url}`);
      }
    );

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled(), { timeout: 1000 });
    consoleSpy.mockRestore();
  });

  it('logs when the debounced neighborhoods search-with-params call fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      // Order matters: '/geolocation/municipalities/:id/neighborhoods'
      // contains '/municipalities' as a substring, so the neighborhoods
      // check must win first (same gotcha as the file's default beforeEach).
      if (url.includes('/neighborhoods')) throw new Error('boom');
      if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled(), { timeout: 1000 });
    consoleSpy.mockRestore();
  });

  it('resolves municipalities from a bare-array response (no .data wrapper) via the debounced search', async () => {
    vi.mocked(api.get).mockImplementation(
      async (url: string, config?: { params?: { search: string } }) => {
        if (url === '/geolocation/states') return { data: { data: STATES } };
        if (url.includes('/municipalities')) {
          if (config?.params) return { data: MUNICIPALITIES }; // bare array, sin envoltura .data
          return { data: { data: MUNICIPALITIES } };
        }
        throw new Error(`unmocked: ${url}`);
      }
    );

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    await waitForDebounce();

    expect(screen.getByText('Fresnillo')).toBeInTheDocument();
  });

  it('resolves an empty municipalities list when the debounced search response has no data at all', async () => {
    vi.mocked(api.get).mockImplementation(
      async (url: string, config?: { params?: { search: string } }) => {
        if (url === '/geolocation/states') return { data: { data: STATES } };
        if (url.includes('/municipalities')) {
          if (config?.params) return { data: null };
          return { data: { data: MUNICIPALITIES } };
        }
        throw new Error(`unmocked: ${url}`);
      }
    );

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    await waitForDebounce();

    expect(screen.queryByText('Fresnillo')).not.toBeInTheDocument();
  });

  it('resolves neighborhoods from a bare-array response (no .data wrapper) via the debounced search', async () => {
    vi.mocked(api.get).mockImplementation(
      async (url: string, config?: { params?: { search: string } }) => {
        if (url === '/geolocation/states') return { data: { data: STATES } };
        if (url.includes('/neighborhoods')) {
          if (config?.params) return { data: NEIGHBORHOODS }; // bare array
          return { data: { data: NEIGHBORHOODS } };
        }
        if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
        throw new Error(`unmocked: ${url}`);
      }
    );

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    await waitForDebounce();

    expect(screen.getByText('Centro')).toBeInTheDocument();
  });

  it('resolves an empty neighborhoods list when the debounced search response has no data at all', async () => {
    vi.mocked(api.get).mockImplementation(
      async (url: string, config?: { params?: { search: string } }) => {
        if (url === '/geolocation/states') return { data: { data: STATES } };
        if (url.includes('/neighborhoods')) {
          if (config?.params) return { data: null };
          return { data: { data: NEIGHBORHOODS } };
        }
        if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
        throw new Error(`unmocked: ${url}`);
      }
    );

    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/1/municipalities')
    );

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    await waitForDebounce();

    expect(screen.queryByText('Centro')).not.toBeInTheDocument();
  });

  it('handleNeighborhoodChange accepts a bare-array duplicate lookup and falls back for missing municipio/estado names', async () => {
    const onChange = vi.fn();
    let municipalitiesCallCount = 0;
    const namelessStates = [{ id: 1, name: '' }];
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: namelessStates } };
      if (url.includes('/neighborhoods')) return { data: { data: NEIGHBORHOODS } };
      if (url.includes('/municipalities')) {
        municipalitiesCallCount += 1;
        // 1er llamado: efecto de seleccion de estado (debe traer opciones para
        // habilitar Municipio, con name normal). 2do llamado: la busqueda
        // duplicada propia de handleNeighborhoodChange -- bare array SIN
        // campo name, para forzar munObj?.name a su fallback tambien.
        if (municipalitiesCallCount > 1) return { data: [{ id: 10 }] };
        return { data: { data: MUNICIPALITIES } };
      }
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    // El unico Estado disponible tiene name:'' -- se localiza por su rol de
    // opcion (getStateLabel devuelve '', no hay texto visible que buscar).
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findAllByRole('option').then((opts) => opts[0]));
    await waitFor(() => expect(municipalitiesCallCount).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    fireEvent.click(await screen.findByText('Centro'));

    // stateObj?.name||'' y munObj?.name||'' ambos vacios -> "Centro, , "
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(100, 'Centro, , '));
  });

  it('handleNeighborhoodChange falls back to [] when its duplicate lookup response has no data at all', async () => {
    const onChange = vi.fn();
    let municipalitiesCallCount = 0;
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/neighborhoods')) return { data: { data: NEIGHBORHOODS } };
      if (url.includes('/municipalities')) {
        municipalitiesCallCount += 1;
        if (municipalitiesCallCount > 1) return { data: null }; // data??[] -> []
        return { data: { data: MUNICIPALITIES } };
      }
      throw new Error(`unmocked: ${url}`);
    });

    render(<ArchonGeoSelector onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    await waitFor(() => expect(municipalitiesCallCount).toBeGreaterThan(0));

    fireEvent.click(screen.getByText('Buscar Municipio...'));
    fireEvent.click(await screen.findByText('Fresnillo'));

    fireEvent.click(screen.getByText('Buscar Colonia...'));
    fireEvent.click(await screen.findByText('Centro'));

    // munList=[] -> munObj undefined -> "Centro, , Zacatecas"
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(100, 'Centro, , Zacatecas'));
  });

  it('fetchStates accepts a bare-array response (no .data wrapper)', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: STATES }; // bare array
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    expect(await screen.findByText('Zacatecas')).toBeInTheDocument();
  });

  it('fetchStates falls back to [] when the states response has no data at all', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: null };
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    await waitForDebounce();
    expect(screen.queryByText('Zacatecas')).not.toBeInTheDocument();
  });

  it('the state->municipalities cascade fetch accepts a bare-array response (no .data wrapper)', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/municipalities')) return { data: MUNICIPALITIES }; // bare array
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    fireEvent.click(screen.getByText('Buscar Municipio...'));
    expect(await screen.findByText('Fresnillo')).toBeInTheDocument();
  });

  it('the state->municipalities cascade fetch falls back to [] when the response has no data at all', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url.includes('/municipalities')) return { data: null };
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Buscar Estado...')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Buscar Estado...'));
    fireEvent.click(await screen.findByText('Zacatecas'));
    fireEvent.click(screen.getByText('Buscar Municipio...'));
    await waitForDebounce();
    expect(screen.queryByText('Fresnillo')).not.toBeInTheDocument();
  });

  it('neighborhood hydration does nothing when the response has no data at all', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/geolocation/states') return { data: { data: STATES } };
      if (url === '/geolocation/neighborhoods/100') return { data: null };
      if (url.includes('/municipalities')) return { data: { data: MUNICIPALITIES } };
      throw new Error(`unmocked: ${url}`);
    });
    render(<ArchonGeoSelector value={100} onChange={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/geolocation/neighborhoods/100'));
    // sin datos que hidratar, el selector permanece sin seleccion
    expect(await screen.findByText('Buscar Estado...')).toBeInTheDocument();
  });
});
