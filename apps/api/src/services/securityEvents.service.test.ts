import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as SecurityEventsRepository from './securityEvents.repository';
import { runSecurityEventsLifecycle } from './securityEvents.service';

/** FC201 F1 — ciclo de vida de los eventos de seguridad (Inv-4). */

vi.mock('./securityEvents.repository', () => ({
  clearExpiredClearIps: vi.fn(),
  deleteOldSecurityEvents: vi.fn(),
  deleteStaleDenylistEntries: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSecurityEventsLifecycle', () => {
  it('corre las tres limpiezas y reporta cuántas filas tocó cada una', async () => {
    (SecurityEventsRepository.clearExpiredClearIps as Mock).mockResolvedValue(4);
    (SecurityEventsRepository.deleteOldSecurityEvents as Mock).mockResolvedValue(5);
    (SecurityEventsRepository.deleteStaleDenylistEntries as Mock).mockResolvedValue(1);

    expect(await runSecurityEventsLifecycle()).toEqual({
      clearedIps: 4,
      purgedEvents: 5,
      purgedDenylist: 1,
    });
  });
});
