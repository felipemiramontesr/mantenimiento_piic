import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as HousekeepingRepository from './authHousekeeping.repository';
import { recordAuditLog } from './auditService';
import { runAuthHousekeeping } from './authHousekeeping.service';

/** FC199 F4 — el barrido borra una por una, audita solo lo borrado y reporta las tres limpiezas. */

vi.mock('./authHousekeeping.repository', () => ({
  findPurgeableAccountIds: vi.fn(),
  deletePurgeableAccount: vi.fn(),
  deleteExpiredNonces: vi.fn(),
  deleteStaleCounters: vi.fn(),
}));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  (HousekeepingRepository.deleteExpiredNonces as Mock).mockResolvedValue(4);
  (HousekeepingRepository.deleteStaleCounters as Mock).mockResolvedValue(2);
});

describe('runAuthHousekeeping', () => {
  it('borra cada candidata, audita solo las borradas y reporta las tres limpiezas', async () => {
    (HousekeepingRepository.findPurgeableAccountIds as Mock).mockResolvedValue([7, 8]);
    // La 8 confirmó su 2FA entre la búsqueda y el borrado: el DELETE re-verificado no la toca.
    (HousekeepingRepository.deletePurgeableAccount as Mock).mockImplementation(
      async (id: number) => id === 7
    );

    const report = await runAuthHousekeeping();

    expect(report).toEqual({ purgedAccounts: 1, expiredNonces: 4, staleCounters: 2 });
    expect(HousekeepingRepository.deletePurgeableAccount).toHaveBeenCalledTimes(2);
    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'user',
        entity_id: '7',
        action: 'DELETE',
        user_id: null,
      })
    );
  });

  it('sin candidatas: no borra ni audita cuentas, pero limpia nonces y contadores', async () => {
    (HousekeepingRepository.findPurgeableAccountIds as Mock).mockResolvedValue([]);

    const report = await runAuthHousekeeping();

    expect(report).toEqual({ purgedAccounts: 0, expiredNonces: 4, staleCounters: 2 });
    expect(HousekeepingRepository.deletePurgeableAccount).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
