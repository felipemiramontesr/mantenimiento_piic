import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import EncryptionService from './encryption';
import * as UserRepository from './authUserManagement.repository';
import { getUserNode } from './authUserManagement.service';

/**
 * FC189 — mismo guard de `mapUserResponse` aplicado a `getUserNode` (GET /users/:uuid/node):
 * `EncryptionService.decrypt(user.email)` sin protección tronaba con `email IS NULL`. Usa el
 * `EncryptionService` REAL (sin mockear) para no enmascarar el bug que un mock falsy-safe ocultaría.
 */

vi.mock('./authUserManagement.repository', () => ({
  findOwnerMembershipIdsByUserId: vi.fn(),
  findUserWithDepartmentByUuid: vi.fn(),
  findRecentRoutesByDriverId: vi.fn().mockResolvedValue([]),
}));

function omegaRow(email: unknown): Record<string, unknown> {
  return { id: 1, uuid: 'u-1', username: 'grayman', role_id: 0, email };
}

describe('FC189 — getUserNode: email NULL ya no truena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('email NULL ⇒ 200 con email "" en vez de 500 (ownerScope null, sin chequeo de scope)', async () => {
    (UserRepository.findUserWithDepartmentByUuid as Mock).mockResolvedValue(omegaRow(null));

    const result = await getUserNode('u-1', null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user.email).toBe('');
  });

  it('email cifrado presente ⇒ se descifra igual que siempre (0 regresión)', async () => {
    const encrypted = EncryptionService.encrypt('grayman@piic.com.mx');
    (UserRepository.findUserWithDepartmentByUuid as Mock).mockResolvedValue(omegaRow(encrypted));

    const result = await getUserNode('u-1', null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.user.email).toBe('grayman@piic.com.mx');
  });
});
