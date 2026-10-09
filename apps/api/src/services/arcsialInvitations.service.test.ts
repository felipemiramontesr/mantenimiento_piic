import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from './db';
import { findProfileByHandle } from './arcsialProfiles.repository';
import { areContacts, isBlockedEitherWay } from './arcsialRelations.repository';
import * as Invitations from './arcsialInvitations.repository';
import { listInbox } from './arcsialInbox.repository';
import { validateLinkCandidate } from './universeUserLinking';
import { issueInvitation, listInvitations } from './arcsialInvitations.service';

/** FC209 F2 — T1 (12 filas) de la emisión, en el orden de la tabla, y el listado con caducidad pasiva. */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./arcsialProfiles.repository', () => ({ findProfileByHandle: vi.fn() }));
vi.mock('./arcsialRelations.repository', () => ({
  areContacts: vi.fn(),
  isBlockedEitherWay: vi.fn(),
}));
vi.mock('./arcsialInvitations.repository', () => ({
  findMuTenantId: vi.fn(),
  countSentRecently: vi.fn(),
  countPendingToPair: vi.fn(),
  insertInvitation: vi.fn(),
  expirePendingFor: vi.fn(),
}));
vi.mock('./arcsialInbox.repository', () => ({ listInbox: vi.fn() }));
vi.mock('./universeUserLinking', () => ({ validateLinkCandidate: vi.fn() }));

const conn = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};
const SENDER = 3;
const RECIPIENT = { userId: 9, handle: 'ana', displayName: 'Ana', avatarUrl: null };

/** Escenario base que pasa todas las puertas; cada prueba apaga una. */
function givenAllGatesPass(): void {
  vi.mocked(findProfileByHandle).mockResolvedValue(RECIPIENT);
  vi.mocked(isBlockedEitherWay).mockResolvedValue(false);
  vi.mocked(areContacts).mockResolvedValue(false);
  vi.mocked(Invitations.findMuTenantId).mockResolvedValue(41);
  vi.mocked(validateLinkCandidate).mockResolvedValue({ rfc: 'XAXX010101000' } as never);
  vi.mocked(Invitations.countSentRecently).mockResolvedValue({ lastHour: 9, lastDay: 49 });
  vi.mocked(Invitations.countPendingToPair).mockResolvedValue(2);
  vi.mocked(Invitations.insertInvitation).mockResolvedValue({ id: 77, expiresAt: '2026-10-16' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getConnection).mockResolvedValue(conn as never);
  givenAllGatesPass();
});

describe('T1 — emisión', () => {
  it('fila 1: CONTACT válido ⇒ 201 con token; se guarda su SHA-256 y tenant NULL', async () => {
    const result = await issueInvitation(SENDER, 'ana', 'CONTACT');
    expect(result).toMatchObject({
      ok: true,
      id: 77,
      inviteType: 'CONTACT',
      expiresAt: '2026-10-16',
    });
    const token = (result as { inviteToken: string }).inviteToken;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(Invitations.insertInvitation).toHaveBeenCalledWith(
      {
        senderId: SENDER,
        recipientId: 9,
        inviteType: 'CONTACT',
        tenantId: null,
        tokenHash: createHash('sha256').update(token).digest('hex'),
      },
      conn
    );
    expect(conn.commit).toHaveBeenCalled();
    expect(Invitations.findMuTenantId).not.toHaveBeenCalled();
  });

  it('fila 2: UNIVERSE válido ⇒ guarda el tenant del Universo del MU emisor', async () => {
    expect(await issueInvitation(SENDER, 'ana', 'UNIVERSE')).toMatchObject({
      ok: true,
      inviteType: 'UNIVERSE',
    });
    expect(vi.mocked(Invitations.insertInvitation).mock.calls[0][0].tenantId).toBe(41);
    expect(validateLinkCandidate).toHaveBeenCalledWith(9);
    expect(areContacts).not.toHaveBeenCalled();
  });

  it('fila 3: 3 pendientes al par ⇒ 409, rollback y sin INSERT', async () => {
    vi.mocked(Invitations.countPendingToPair).mockResolvedValue(3);
    expect(await issueInvitation(SENDER, 'ana', 'UNIVERSE')).toMatchObject({
      status: 409,
      code: 'MAX_PENDING_INVITATIONS_EXCEEDED',
    });
    expect(conn.rollback).toHaveBeenCalled();
    expect(Invitations.insertInvitation).not.toHaveBeenCalled();
  });

  it.each([[{ lastHour: 10, lastDay: 10 }], [{ lastHour: 0, lastDay: 50 }]])(
    'fila 4: cuota global %o ⇒ 429 antes de mirar el par',
    async (sent) => {
      vi.mocked(Invitations.countSentRecently).mockResolvedValue(sent);
      expect(await issueInvitation(SENDER, 'ana', 'CONTACT')).toMatchObject({
        status: 429,
        code: 'INVITATION_RATE_LIMIT_EXCEEDED',
      });
      expect(Invitations.countPendingToPair).not.toHaveBeenCalled();
      expect(conn.rollback).toHaveBeenCalled();
    }
  );

  it.each([
    [5, 409, 'LINKED_USER_MISSING_BILLING_PROFILE'],
    [6, 409, 'LINKED_USER_ALREADY_MEMBER'],
    [7, 409, 'LINKED_USER_INACTIVE'],
    [8, 403, 'CANNOT_LINK_OMEGA_USER'],
  ])('fila %i: la puerta del destinatario responde %i %s, sin TX', async (_row, status, code) => {
    vi.mocked(validateLinkCandidate).mockResolvedValue({ ok: false, status, code, message: code });
    expect(await issueInvitation(SENDER, 'ana', 'UNIVERSE')).toMatchObject({ status, code });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('fila 9: emisor que no es MU ⇒ 403, sin evaluar al destinatario', async () => {
    vi.mocked(Invitations.findMuTenantId).mockResolvedValue(null);
    expect(await issueInvitation(SENDER, 'ana', 'UNIVERSE')).toMatchObject({
      status: 403,
      code: 'SENDER_NOT_MASTER_OF_UNIVERSE',
    });
    expect(validateLinkCandidate).not.toHaveBeenCalled();
  });

  it('fila 10: ya son contactos (CONTACT) ⇒ 409', async () => {
    vi.mocked(areContacts).mockResolvedValue(true);
    expect(await issueInvitation(SENDER, 'ana', 'CONTACT')).toMatchObject({
      status: 409,
      code: 'ALREADY_CONTACTS',
    });
  });

  it('fila 11: a uno mismo ⇒ 400', async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue({ ...RECIPIENT, userId: SENDER });
    expect(await issueInvitation(SENDER, 'yo', 'CONTACT')).toMatchObject({
      status: 400,
      code: 'CANNOT_INVITE_SELF',
    });
  });

  it.each([
    ['handle inexistente', null, false],
    ['bloqueo en cualquier sentido', RECIPIENT, true],
  ])('fila 12: %s ⇒ 404 opaco antes que cualquier otra puerta', async (_l, profile, blocked) => {
    vi.mocked(findProfileByHandle).mockResolvedValue(profile);
    vi.mocked(isBlockedEitherWay).mockResolvedValue(blocked);
    expect(await issueInvitation(SENDER, 'ana', 'UNIVERSE')).toMatchObject({
      status: 404,
      code: 'USER_NOT_FOUND',
    });
    expect(Invitations.findMuTenantId).not.toHaveBeenCalled();
  });

  it('un error en la TX revierte y se propaga', async () => {
    vi.mocked(Invitations.insertInvitation).mockRejectedValue(new Error('down'));
    await expect(issueInvitation(SENDER, 'ana', 'CONTACT')).rejects.toThrow('down');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});

describe('listInvitations', () => {
  it('vence las PENDING caducadas del usuario y luego lista', async () => {
    vi.mocked(listInbox).mockResolvedValue([]);
    expect(await listInvitations(SENDER)).toEqual([]);
    expect(Invitations.expirePendingFor).toHaveBeenCalledWith(SENDER);
    expect(vi.mocked(Invitations.expirePendingFor).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(listInbox).mock.invocationCallOrder[0]
    );
  });
});
