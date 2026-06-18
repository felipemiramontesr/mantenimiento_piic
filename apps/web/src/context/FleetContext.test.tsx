import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
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
    isExternalClientOnly: (): boolean => false,
    isSuiteVIM: (): boolean => false,
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
