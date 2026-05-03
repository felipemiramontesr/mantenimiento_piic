import { render, screen, act, waitFor } from '@testing-library/react';
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
      created_at: new Date().toISOString()
    }
  ];

  it('renders forensic logs correctly', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { success: true, data: mockLogs } });

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
});
