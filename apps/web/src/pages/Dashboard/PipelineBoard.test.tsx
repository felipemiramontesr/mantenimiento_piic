import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import PipelineBoard from './PipelineBoard';
import api from '../../api/client';

vi.mock('../../api/client');

const MOCK_STAGES = [
  {
    id: 1,
    code: 'PROSPECTING',
    label: 'Prospección',
    position: 1,
    color: '#6366f1',
    opportunities: [],
  },
  {
    id: 3,
    code: 'PROPOSAL',
    label: 'Propuesta',
    position: 3,
    color: '#f59e0b',
    opportunities: [
      {
        id: 1,
        ownerId: 5,
        stageId: 3,
        title: 'Oportunidad Flota Norte',
        valueMxn: 150000,
        probabilityPct: 70,
        assignedTo: null,
        notes: null,
        createdBy: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-8 CRM_Advanced FaseB — PipelineBoard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-B-WEB-1: renders pipeline board container', async () => {
    mockGet.mockResolvedValueOnce({ data: { stages: [] } });
    render(<PipelineBoard />);
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-board')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-B-WEB-2: renders stage columns with opportunities', async () => {
    mockGet.mockResolvedValueOnce({ data: { stages: MOCK_STAGES } });
    render(<PipelineBoard />);
    await waitFor(() => {
      expect(screen.getByTestId('stage-column-PROSPECTING')).toBeInTheDocument();
      expect(screen.getByTestId('stage-column-PROPOSAL')).toBeInTheDocument();
      expect(screen.getByTestId('opportunity-card-1')).toBeInTheDocument();
      expect(screen.getByText('Oportunidad Flota Norte')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-B-WEB-3: shows empty state when no opportunities', async () => {
    mockGet.mockResolvedValueOnce({ data: { stages: [] } });
    render(<PipelineBoard />);
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-empty')).toBeInTheDocument();
    });
  });

  it('AT-CRM8-B-WEB-4: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<PipelineBoard />);
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-error')).toBeInTheDocument();
    });
  });
});
