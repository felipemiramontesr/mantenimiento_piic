import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import ContractsPanel from './ContractsPanel';
import api from '../../api/client';

vi.mock('../../api/client');

const MOCK_CONTRACTS = [
  {
    id: 1,
    ownerId: 5,
    unitId: null,
    title: 'Contrato Mantenimiento Anual',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    slaHours: 24,
    status: 'ACTIVE',
    notes: null,
    createdBy: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-8 CRM_Advanced FaseA — ContractsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-A-WEB-1: renders panel container', async () => {
    mockGet.mockResolvedValueOnce({ data: { contracts: [] } });
    render(<ContractsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('contracts-panel')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-A-WEB-2: renders contract cards from API', async () => {
    mockGet.mockResolvedValueOnce({ data: { contracts: MOCK_CONTRACTS } });
    render(<ContractsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('contracts-grid')).toBeInTheDocument();
      expect(screen.getByText('Contrato Mantenimiento Anual')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-A-WEB-3: shows empty state when no contracts', async () => {
    mockGet.mockResolvedValueOnce({ data: { contracts: [] } });
    render(<ContractsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('contracts-empty')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-A-WEB-4: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<ContractsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('contracts-error')).toBeInTheDocument();
    });
  });
});
