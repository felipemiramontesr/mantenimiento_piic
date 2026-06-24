import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import CampaignsPanel from './CampaignsPanel';
import api from '../../api/client';

vi.mock('../../api/client');

const MOCK_CAMPAIGNS = [
  {
    id: 1,
    ownerId: 5,
    name: 'Recordatorio Mantenimiento',
    subject: 'Su servicio vence pronto',
    bodyText: 'Le informamos que su servicio preventivo está por vencer.',
    type: 'MAINTENANCE_REMINDER' as const,
    createdBy: 2,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-8 CRM_Advanced FaseE — CampaignsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-E-WEB-1: renders campaigns panel container', async () => {
    mockGet.mockResolvedValueOnce({ data: { campaigns: [] } });
    render(<CampaignsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('campaigns-panel')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-E-WEB-2: renders campaign cards with send button', async () => {
    mockGet.mockResolvedValueOnce({ data: { campaigns: MOCK_CAMPAIGNS } });
    render(<CampaignsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('campaigns-list')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('campaign-send-1')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-E-WEB-3: shows empty state when no campaigns', async () => {
    mockGet.mockResolvedValueOnce({ data: { campaigns: [] } });
    render(<CampaignsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('campaigns-empty')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-E-WEB-4: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<CampaignsPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('campaigns-error')).toBeInTheDocument();
    });
  });
});
