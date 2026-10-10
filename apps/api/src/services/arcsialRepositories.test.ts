import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import * as Profiles from './arcsialProfiles.repository';
import * as Relations from './arcsialRelations.repository';
import * as Invitations from './arcsialInvitations.repository';
import * as Inbox from './arcsialInbox.repository';

/**
 * FC209 F2 — SQL de los repositorios de Arcsial con un executor simulado: forma de la consulta, orden
 * de parámetros y mapeo de filas (incluidas las ramas vacías).
 */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

const execute = vi.fn();
const conn = { execute } as unknown as PoolConnection;

/** Programa las respuestas sucesivas de `execute` (filas). */
function rows(...results: unknown[][]): void {
  results.forEach((r) => execute.mockResolvedValueOnce([r, []]));
}

/** SQL y parámetros de la llamada `n` (0 = primera). */
function call(n = 0): { sql: string; params: unknown[] } {
  const [sql, params] = execute.mock.calls[n];
  return { sql: String(sql).replace(/\s+/g, ' '), params: params as unknown[] };
}

beforeEach(() => execute.mockReset());

describe('arcsialProfiles.repository', () => {
  it('findUserUuid: uuid, null si no hay fila o viene nulo', async () => {
    rows([{ uuid: 'u-1' }], [], [{ uuid: null }]);
    expect(await Profiles.findUserUuid(5, conn)).toBe('u-1');
    expect(await Profiles.findUserUuid(5, conn)).toBeNull();
    expect(await Profiles.findUserUuid(5, conn)).toBeNull();
    expect(call().params).toEqual([5]);
  });

  it('insertProfile y updateHandle escriben con parámetros', async () => {
    rows([], []);
    await Profiles.insertProfile({ userId: 5, handle: 'ana', displayName: 'Ana' }, conn);
    await Profiles.updateHandle(5, 'ana2', conn);
    expect(call(0).sql).toContain('INSERT INTO arcsial_profiles (user_id, handle, display_name)');
    expect(call(0).params).toEqual([5, 'ana', 'Ana']);
    expect(call(1).params).toEqual(['ana2', 5]);
  });

  it('findProfileByHandle: igualdad exacta (sin LIKE) y null sin fila', async () => {
    const profile = { userId: 5, handle: 'ana', displayName: 'Ana', avatarUrl: null };
    rows([profile], []);
    expect(await Profiles.findProfileByHandle('ana', conn)).toEqual(profile);
    expect(await Profiles.findProfileByHandle('nadie', conn)).toBeNull();
    expect(call().sql).toContain('WHERE handle = ?');
    expect(call().sql).not.toMatch(/LIKE|email/i);
  });

  it('findHandleByUserId: handle o null', async () => {
    rows([{ handle: 'ana' }], []);
    expect(await Profiles.findHandleByUserId(5, conn)).toBe('ana');
    expect(await Profiles.findHandleByUserId(6, conn)).toBeNull();
  });

  it('FC209 F3: perfil propio y Universo del MU, o null', async () => {
    const profile = { userId: 5, handle: 'ana', displayName: 'Ana', avatarUrl: null };
    rows([profile], [], [{ id: 41, label: 'Flota Norte' }], []);
    expect(await Profiles.findProfileByUserId(5, conn)).toEqual(profile);
    expect(await Profiles.findProfileByUserId(6, conn)).toBeNull();
    expect(await Profiles.findMuUniverse(3, conn)).toEqual({ id: 41, label: 'Flota Norte' });
    expect(await Profiles.findMuUniverse(4, conn)).toBeNull();
    expect(call(2).sql).toContain('WHERE mu_user_id = ?');
  });

  it('FC209 F3: contactos (la otra parte del par) y bloqueos propios, sin correo', async () => {
    rows([{ id: 9 }], [{ blockedId: 9 }]);
    expect(await Profiles.listContacts(3, conn)).toEqual([{ id: 9 }]);
    expect(await Profiles.listBlocks(3, conn)).toEqual([{ blockedId: 9 }]);
    expect(call(0).sql).toContain('IF(c.user_id_low = ?, c.user_id_high, c.user_id_low)');
    expect(call(0).params).toEqual([3, 3, 3]);
    expect(call(1).sql).toContain('WHERE b.blocker_id = ?');
    [0, 1].forEach((n) => expect(call(n).sql).not.toMatch(/email/i));
  });
});

describe('arcsialRelations.repository', () => {
  it('isBlockedEitherWay consulta los dos sentidos', async () => {
    rows([{ 1: 1 }], []);
    expect(await Relations.isBlockedEitherWay(3, 9, conn)).toBe(true);
    expect(await Relations.isBlockedEitherWay(3, 9, conn)).toBe(false);
    expect(call().params).toEqual([3, 9, 9, 3]);
  });

  it('contactos: el par siempre ordenado low < high', async () => {
    rows([{ 1: 1 }], [], [], []);
    expect(await Relations.areContacts(9, 3, conn)).toBe(true);
    expect(await Relations.areContacts(3, 9, conn)).toBe(false);
    await Relations.insertContact(9, 3, conn);
    await Relations.deleteContact(3, 9, conn);
    [0, 1, 2, 3].forEach((n) => expect(call(n).params).toEqual([3, 9]));
    expect(call(2).sql).toContain('ON DUPLICATE KEY UPDATE');
  });

  it('insertBlock es idempotente y userExists responde por la fila', async () => {
    rows([], [{ 1: 1 }], []);
    await Relations.insertBlock(3, 9, conn);
    expect(call(0).sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(call(0).params).toEqual([3, 9]);
    expect(await Relations.userExists(9, conn)).toBe(true);
    expect(await Relations.userExists(10, conn)).toBe(false);
  });
});

describe('arcsialInvitations.repository', () => {
  it('findMuTenantId: el Universo del MU o null', async () => {
    rows([{ id: 41 }], []);
    expect(await Invitations.findMuTenantId(3, conn)).toBe(41);
    expect(await Invitations.findMuTenantId(4, conn)).toBeNull();
    expect(call().sql).toContain('WHERE mu_user_id = ?');
  });

  it('cuotas: cuenta con FOR UPDATE y convierte a número (sin filas ⇒ 0)', async () => {
    rows([{ lastHour: '2', lastDay: 7 }], [{ lastHour: null, lastDay: 0 }], [{ pending: '1' }], []);
    expect(await Invitations.countSentRecently(3, conn)).toEqual({ lastHour: 2, lastDay: 7 });
    expect(await Invitations.countSentRecently(3, conn)).toEqual({ lastHour: 0, lastDay: 0 });
    expect(await Invitations.countPendingToPair(3, 9, conn)).toBe(1);
    expect(await Invitations.countPendingToPair(3, 9, conn)).toBe(0);
    expect(call(0).sql).toContain('FOR UPDATE');
    expect(call(2).params).toEqual([3, 9]);
    expect(call(2).sql).toContain("status = 'PENDING' AND expires_at >= NOW()");
  });

  it('countSentRecently sin fila devuelve ceros', async () => {
    rows([]);
    expect(await Invitations.countSentRecently(3, conn)).toEqual({ lastHour: 0, lastDay: 0 });
  });

  it('insertInvitation guarda el hash con TTL de 7 días y lee la caducidad de la base', async () => {
    execute.mockResolvedValueOnce([{ insertId: 77 }, []]);
    rows([{ expiresAt: '2026-10-16 10:00:00' }]);
    const saved = await Invitations.insertInvitation(
      {
        senderId: 3,
        recipientId: 9,
        inviteType: 'UNIVERSE',
        tenantId: 41,
        tokenHash: 'h'.repeat(64),
      },
      conn
    );
    expect(saved).toEqual({ id: 77, expiresAt: '2026-10-16 10:00:00' });
    expect(call(0).sql).toContain('NOW() + INTERVAL 7 DAY');
    expect(call(0).params).toEqual([3, 9, 'UNIVERSE', 41, 'h'.repeat(64)]);
    expect(call(1).params).toEqual([77]);
  });

  it('lockInvitation: fila bloqueada con `expired` booleano, o null', async () => {
    const row = {
      id: 1,
      senderId: 3,
      recipientId: 9,
      inviteType: 'CONTACT',
      tenantId: null,
      status: 'PENDING',
    };
    rows([{ ...row, expired: 1 }], []);
    expect(await Invitations.lockInvitation(1, conn)).toEqual({ ...row, expired: true });
    expect(await Invitations.lockInvitation(2, conn)).toBeNull();
    expect(call().sql).toContain('FOR UPDATE');
  });

  it('setInvitationStatus, cancelPendingBetween y expirePendingFor', async () => {
    rows([], [], []);
    await Invitations.setInvitationStatus(1, 'ACCEPTED', conn);
    await Invitations.cancelPendingBetween(3, 9, conn);
    await Invitations.expirePendingFor(3, conn);
    expect(call(0).params).toEqual(['ACCEPTED', 'ACCEPTED', 1]);
    expect(call(1).params).toEqual([3, 9, 9, 3]);
    expect(call(2).sql).toContain("status = 'PENDING' AND expires_at < NOW()");
    expect(call(2).params).toEqual([3, 3]);
  });
});

describe('arcsialInbox.repository', () => {
  it('listInbox: recibidas y enviadas sin token_hash', async () => {
    rows([{ id: 1, direction: 'RECEIVED' }]);
    expect(await Inbox.listInbox(3, conn)).toEqual([{ id: 1, direction: 'RECEIVED' }]);
    expect(call().sql).not.toContain('token_hash');
    expect(call().params).toEqual([3, 3, 3, 3]);
  });

  it('lockRecipient: usuario, membresías y fisco con FOR UPDATE; null sin usuario', async () => {
    rows([{ is_active: 1, role_id: '2' }], [{ 1: 1 }], []);
    expect(await Inbox.lockRecipient(9, conn)).toEqual({
      isActive: true,
      roleId: 2,
      hasMembership: true,
      hasBillingProfile: false,
    });
    [0, 1, 2].forEach((n) => expect(call(n).sql).toContain('FOR UPDATE'));
    rows([]);
    expect(await Inbox.lockRecipient(10, conn)).toBeNull();
  });
});
