import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../../test/testUtils';
import ForensicJournalTable from './ForensicJournalTable';
import api from '../../api/client';
import { archonCache } from '../../utils/archonCache';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ForensicJournalTable (Apex Standard)', () => {
  beforeEach(() => {
    archonCache.clear();
  });
  const mockLogs = [
    {
      id: 'uuid-12345678',
      unit_id: 'ASM-001',
      event_type: 'ROUTE_INCIDENT',
      status_before: 'En Ruta',
      status_after: 'En Mantenimiento',
      description: 'MECANICA: Falla motor',
      created_at: new Date().toISOString(),
    },
  ];

  it('renders forensic logs correctly using sovereign providers', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockLogs } });

    render(<ForensicJournalTable />);

    // 🛡️ WAIT FOR HYDRATION: Ensure the 'Accediendo a Memoria Forense...' message disappears
    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('ASM-001')).toBeInTheDocument();
    expect(screen.getByText(/MECANICA: Falla motor/i)).toBeInTheDocument();
    expect(screen.getByText(/INCIDENCIA/i)).toBeInTheDocument();
  });

  it('renders different event styles correctly with exact regex matching', async () => {
    const multiLogs = [
      {
        id: 'uuid-start-1',
        unit_id: 'ASM-002',
        event_type: 'ROUTE_START',
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-finish-1',
        unit_id: 'ASM-003',
        event_type: 'ROUTE_FINISH',
        created_at: new Date().toISOString(),
      },
      {
        id: 'uuid-unk-1',
        unit_id: 'ASM-004',
        event_type: 'UNKNOWN',
        created_at: new Date().toISOString(),
      },
    ];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: multiLogs } });

    render(<ForensicJournalTable />);

    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/SALIDA/i)).toBeInTheDocument();
    expect(screen.getByText(/ENTRADA/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully in the journal', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Forensic Failure'));

    render(<ForensicJournalTable />);

    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Sin registros forenses/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
