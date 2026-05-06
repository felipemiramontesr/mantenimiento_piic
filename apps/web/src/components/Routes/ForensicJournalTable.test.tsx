import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ForensicJournalTable from './ForensicJournalTable';
import { FleetProvider } from '../../context/FleetContext';
import { UserProvider } from '../../context/UserContext';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ForensicJournalTable (Audit Standard)', () => {
  const mockLogs = [
    {
      id: 1,
      unit_id: 'ASM-001',
      event_type: 'ROUTE_INCIDENT',
      status_before: 'En Ruta',
      status_after: 'En Mantenimiento',
      description: 'MECANICA: Falla motor',
      created_at: new Date().toISOString(),
    },
  ];

  it('renders forensic logs correctly', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockLogs } });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <ForensicJournalTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeDefined();
    });
    expect(screen.getByText(/MECANICA: Falla motor/i)).toBeDefined();
    expect(screen.getByText(/INCIDENCIA/i)).toBeDefined();
  });

  it('renders different event styles correctly', async () => {
    const multiLogs = [
      {
        id: 2,
        unit_id: 'ASM-002',
        event_type: 'ROUTE_START',
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        unit_id: 'ASM-003',
        event_type: 'ROUTE_FINISH',
        created_at: new Date().toISOString(),
      },
      { id: 4, unit_id: 'ASM-004', event_type: 'UNKNOWN', created_at: new Date().toISOString() },
    ];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: multiLogs } });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <ForensicJournalTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/SALIDA/i)).toBeDefined();
      expect(screen.getByText(/ENTRADA/i)).toBeDefined();
      expect(screen.getByText(/EVENTO/i)).toBeDefined();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Forensic Failure'));

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <ForensicJournalTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(/Accediendo a Memoria Forense/i)).toBeNull();
    });
  });
});
