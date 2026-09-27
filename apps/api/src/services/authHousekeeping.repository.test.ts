import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import {
  deleteExpiredNonces,
  deletePurgeableAccount,
  deleteStaleCounters,
  findPurgeableAccountIds,
} from './authHousekeeping.repository';

/**
 * FC199 F4 — SQL del triple barrido. La condición de purga se verifica completa (Inv-5, P9: nombres
 * reales `is_confirmed` y `tenant_user_memberships`) y va igual en la búsqueda y en el DELETE.
 */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

const REQUIRED_CLAUSES = [
  "u.signup_source = 'public'",
  'u.created_at < NOW() - INTERVAL 48 HOUR',
  'user_mfa_credentials c WHERE c.user_id = u.id AND c.is_confirmed = 1',
  'tenant_user_memberships m WHERE m.user_id = u.id',
  'tenants t WHERE t.mu_user_id = u.id',
  'financial_transactions f WHERE f.created_by = u.id',
];

describe('findPurgeableAccountIds / deletePurgeableAccount', () => {
  it('la búsqueda lleva la condición completa y responde los ids', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 7 }, { id: '9' }], undefined]);

    expect(await findPurgeableAccountIds()).toEqual([7, 9]);
    const [sql] = (db.execute as Mock).mock.calls[0];
    REQUIRED_CLAUSES.forEach((clause) => expect(sql).toContain(clause));
    expect(sql).not.toMatch(/is_verified|tenant_memberships\b/);
  });

  it('el DELETE vuelve a verificar la MISMA condición, por id parametrizado', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    expect(await deletePurgeableAccount(7)).toBe(true);
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toMatch(/^DELETE u FROM users u\s+WHERE u\.id = \?/);
    REQUIRED_CLAUSES.forEach((clause) => expect(sql).toContain(clause));
    expect(params).toEqual([7]);
  });

  it('si ya no cumple (confirmó 2FA entre medias): 0 filas → false', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    expect(await deletePurgeableAccount(7)).toBe(false);
  });
});

describe('deleteExpiredNonces / deleteStaleCounters', () => {
  it('nonces: solo los vencidos, y responde cuántos', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 12 }, undefined]);

    expect(await deleteExpiredNonces()).toBe(12);
    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM auth_challenge_nonces WHERE expires_at < NOW()'
    );
  });

  it('contadores: sin actividad en más de 24 h (fuera de las ventanas de login y correo)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 3 }, undefined]);

    expect(await deleteStaleCounters()).toBe(3);
    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM auth_throttle_counters WHERE last_attempt_at < NOW() - INTERVAL 24 HOUR'
    );
  });
});
