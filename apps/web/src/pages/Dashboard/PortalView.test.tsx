import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import PortalView from './PortalView';
import api from '../../api/client';

vi.mock('../../api/client');

const MOCK_UNITS = [
  {
    id: 'VIM001',
    ownerId: 5,
    brand: 'Caterpillar',
    model: '336',
    year: 2020,
    status: 'Disponible',
  },
];

const MOCK_ORDERS = [
  {
    id: 1,
    unitId: 'VIM001',
    type: 'MAINTENANCE',
    startDatetime: '2026-01-10T08:00:00Z',
    endDatetime: '2026-01-10T16:00:00Z',
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-8 CRM_Advanced FaseD — PortalView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-D-WEB-1: renders portal view container', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { units: [] } })
      .mockResolvedValueOnce({ data: { workOrders: [] } });
    render(<PortalView />);
    await waitFor(() => {
      expect(screen.getByTestId('portal-view')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-D-WEB-2: renders fleet unit cards and work orders', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { units: MOCK_UNITS } })
      .mockResolvedValueOnce({ data: { workOrders: MOCK_ORDERS } });
    render(<PortalView />);
    await waitFor(() => {
      expect(screen.getByTestId('portal-units-grid')).toBeInTheDocument();
      expect(screen.getByTestId('portal-unit-VIM001')).toBeInTheDocument();
      expect(screen.getByTestId('portal-orders-list')).toBeInTheDocument();
      expect(screen.getByTestId('portal-order-1')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-D-WEB-3: shows empty states when no data', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { units: [] } })
      .mockResolvedValueOnce({ data: { workOrders: [] } });
    render(<PortalView />);
    await waitFor(() => {
      expect(screen.getByTestId('portal-units-empty')).toBeInTheDocument();
      expect(screen.getByTestId('portal-orders-empty')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-D-WEB-4: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<PortalView />);
    await waitFor(() => {
      expect(screen.getByTestId('portal-error')).toBeInTheDocument();
    });
  });
});
