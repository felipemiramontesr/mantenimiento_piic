import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/testUtils';
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
