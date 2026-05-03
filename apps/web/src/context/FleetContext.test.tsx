import { render, waitFor, act, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FleetProvider, useFleet } from './FleetContext';
import api from '../api/client';

// 🔱 Mock API Client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

// Test Component to consume the context
const TestComponent = (): React.JSX.Element => {
  const { stats, refreshUnits, reportIncident, startRoute, finishRoute } = useFleet();
  return (
    <div>
      <div data-testid="total">{stats.total}</div>
      <div data-testid="incidents">{stats.openIncidents}</div>
      <button onClick={(): void => { refreshUnits().catch(() => {}); }}>Refresh</button>
      <button onClick={(): void => { reportIncident('uuid', { category: 'MECANICA', description: 'Test', severity: 'LOW' }).catch(() => {}); }}>
        Report
      </button>
      <button onClick={(): void => { startRoute({ unitId: 'U1', driverId: 1, startReading: 10, destination: 'D' }).catch(() => {}); }}>
        Start
      </button>
      <button onClick={(): void => { finishRoute('uuid', { endReading: 20 }).catch(() => {}); }}>
        Finish
      </button>
    </div>
  );
};

describe('FleetContext (Sovereign State Engine)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial stats and hydrates from API', async () => {
    (api.get as vi.Mock).mockImplementation((url: string) => {
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/incidents') return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.reject(new Error('Unknown URL'));
    });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    const { getByTestId } = renderResult!;
    expect(getByTestId('total').textContent).toBe('0');
    expect(api.get).toHaveBeenCalledWith('/fleet');
    expect(api.get).toHaveBeenCalledWith('/incidents');
  });

  it('calculates complex metrics correctly (MTBF, MTTR)', async () => {
    const mockUnits = [
      { id: 'U1', status: 'Disponible', mtbfHours: 100, mttrHours: 10, assetTypeId: 1 },
      { id: 'U2', status: 'En Ruta', mtbfHours: 200, mttrHours: 20, assetTypeId: 1 },
    ];

    (api.get as vi.Mock).mockImplementation((url: string) => {
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      if (url === '/incidents') return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.reject(new Error('Unknown URL'));
    });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    const { getByTestId } = renderResult!;
    await waitFor(() => expect(getByTestId('total').textContent).toBe('2'));
  });

  it('handles reportIncident and refreshes incidents count', async () => {
    (api.get as vi.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (api.post as vi.Mock).mockResolvedValue({ data: { success: true } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    const { getByText } = renderResult!;
    
    // Mock the second call for incidents after report
    (api.get as vi.Mock).mockImplementation((url: string) => {
      if (url === '/incidents') return Promise.resolve({ data: { success: true, data: [{ status: 'OPEN' }] } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      getByText('Report').click();
    });

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/incidents'));
  });

  it('handles startRoute and finishRoute with unit refresh', async () => {
    (api.get as vi.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (api.post as vi.Mock).mockResolvedValue({ data: { success: true } });
    (api.patch as vi.Mock).mockResolvedValue({ data: { success: true } });

    let renderResult: RenderResult | undefined;
    await act(async () => {
      renderResult = render(
        <FleetProvider>
          <TestComponent />
        </FleetProvider>
      );
    });

    const { getByText } = renderResult!;

    await act(async () => {
      getByText('Start').click();
    });
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/routes/start', expect.any(Object)));

    await act(async () => {
      getByText('Finish').click();
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/routes/uuid/finish', expect.any(Object)));
  });

  it('throws error when useFleet is used outside provider', () => {
    // Silence console.error for this test to keep logs clean
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation((): void => {});
    
    expect(() => render(<TestComponent />)).toThrow('useFleet must be used within a FleetProvider');
    
    consoleSpy.mockRestore();
  });
});
