import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import InteractionsLog from './InteractionsLog';
import api from '../../api/client';

vi.mock('../../api/client');

const MOCK_INTERACTIONS = [
  {
    id: 1,
    ownerId: 5,
    contactId: null,
    type: 'CALL',
    summary: 'Llamada de seguimiento al cliente.',
    createdBy: 1,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 2,
    ownerId: 5,
    contactId: null,
    type: 'EMAIL',
    summary: 'Envío de propuesta de mantenimiento anual.',
    createdBy: 1,
    createdAt: '2026-01-20T14:30:00Z',
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-8 CRM_Advanced FaseC — InteractionsLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-C-WEB-1: renders interactions log container', async () => {
    mockGet.mockResolvedValueOnce({ data: { interactions: [] } });
    render(<InteractionsLog />);
    await waitFor(() => {
      expect(screen.getByTestId('interactions-log')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-C-WEB-2: renders interaction rows from API', async () => {
    mockGet.mockResolvedValueOnce({ data: { interactions: MOCK_INTERACTIONS } });
    render(<InteractionsLog />);
    await waitFor(() => {
      expect(screen.getByTestId('interactions-list')).toBeInTheDocument();
      expect(screen.getByTestId('interaction-row-1')).toBeInTheDocument();
      expect(screen.getByText('Llamada de seguimiento al cliente.')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-C-WEB-3: shows empty state when no interactions', async () => {
    mockGet.mockResolvedValueOnce({ data: { interactions: [] } });
    render(<InteractionsLog />);
    await waitFor(() => {
      expect(screen.getByTestId('interactions-empty')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-C-WEB-4: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<InteractionsLog />);
    await waitFor(() => {
      expect(screen.getByTestId('interactions-error')).toBeInTheDocument();
    });
  });
});
