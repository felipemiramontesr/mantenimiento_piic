import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from './db';
import * as Invitations from './arcsialInvitations.repository';
import * as Relations from './arcsialRelations.repository';
import { lockRecipient } from './arcsialInbox.repository';
import { findArcCosmonautRoleId, insertCosmonautRoleAssignment } from './cosmology.repository';
import { insertTypedMembership } from './universeMembership.repository';
import { recordAuditLog } from './auditService';
import { acceptInvitation, blockUser, closeInvitation } from './arcsialResponses.service';

/**
 * FC209 F2 — T2 (10 filas) de la aceptación sobre la fila bloqueada, con COMMIT/ROLLBACK según la
 * fila, más rechazo, cancelación y bloqueo. Las puertas de FC207 son las reales (universeUserLinking).
 */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./arcsialInvitations.repository', () => ({
  lockInvitation: vi.fn(),
  setInvitationStatus: vi.fn(),
  cancelPendingBetween: vi.fn(),
}));
vi.mock('./arcsialRelations.repository', () => ({
  isBlockedEitherWay: vi.fn(),
  insertContact: vi.fn(),
  deleteContact: vi.fn(),
  insertBlock: vi.fn(),
  userExists: vi.fn(),
}));
vi.mock('./arcsialInbox.repository', () => ({ lockRecipient: vi.fn() }));
vi.mock('./cosmology.repository', () => ({
  findArcCosmonautRoleId: vi.fn(),
  insertCosmonautRoleAssignment: vi.fn(),
  findMuCosmonautRoleId: vi.fn(),
  insertTenantUserMembership: vi.fn(),
}));
vi.mock('./universeMembership.repository', () => ({ insertTypedMembership: vi.fn() }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const conn = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const SENDER = 3;
const RECIPIENT = 9;
const PENDING = {
  id: 77,
  senderId: SENDER,
  recipientId: RECIPIENT,
  inviteType: 'UNIVERSE' as const,
  tenantId: 41,
  status: 'PENDING' as const,
  expired: false,
};
const FREE_ARC = { isActive: true, roleId: 2, hasMembership: false, hasBillingProfile: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getConnection).mockResolvedValue(conn as never);
  vi.mocked(Invitations.lockInvitation).mockResolvedValue(PENDING);
  vi.mocked(Relations.isBlockedEitherWay).mockResolvedValue(false);
  vi.mocked(lockRecipient).mockResolvedValue(FREE_ARC);
  vi.mocked(findArcCosmonautRoleId).mockResolvedValue(7);
  vi.mocked(Relations.userExists).mockResolvedValue(true);
});

/** Sin altas de membresía, rol ni contacto, y sin COMMIT. */
function expectNothingWritten(): void {
  expect(insertTypedMembership).not.toHaveBeenCalled();
  expect(insertCosmonautRoleAssignment).not.toHaveBeenCalled();
  expect(Relations.insertContact).not.toHaveBeenCalled();
  expect(conn.commit).not.toHaveBeenCalled();
  expect(conn.rollback).toHaveBeenCalled();
}

describe('T2 — aceptación', () => {
  it('fila 1: CONTACT ⇒ contacto + ACCEPTED, sin membresía ni auditoría', async () => {
    vi.mocked(Invitations.lockInvitation).mockResolvedValue({
      ...PENDING,
      inviteType: 'CONTACT',
      tenantId: null,
    });
    expect(await acceptInvitation(RECIPIENT, 77)).toEqual({
      ok: true,
      status: 'ACCEPTED',
      tenantId: null,
    });
    expect(Relations.insertContact).toHaveBeenCalledWith(SENDER, RECIPIENT, conn);
    expect(Invitations.setInvitationStatus).toHaveBeenCalledWith(77, 'ACCEPTED', conn);
    expect(lockRecipient).not.toHaveBeenCalled();
    expect(insertTypedMembership).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
    expect(conn.commit).toHaveBeenCalled();
  });

  it('fila 2: UNIVERSE ⇒ membresía ARC + rol con el tenant guardado + contacto + auditoría', async () => {
    expect(await acceptInvitation(RECIPIENT, 77)).toEqual({
      ok: true,
      status: 'ACCEPTED',
      tenantId: 41,
    });
    expect(insertTypedMembership).toHaveBeenCalledWith(RECIPIENT, 41, 'ARC', conn);
    expect(insertCosmonautRoleAssignment).toHaveBeenCalledWith(RECIPIENT, 7, 41, SENDER, conn);
    expect(Relations.insertContact).toHaveBeenCalledWith(SENDER, RECIPIENT, conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        snapshot_after: { event: 'ACCEPT_UNIVERSE_INVITATION', tenantId: 41, role: 'ARC' },
        owner_id: 41,
      })
    );
  });

  it.each([
    [3, { ...FREE_ARC, hasBillingProfile: false }, 409, 'LINKED_USER_MISSING_BILLING_PROFILE'],
    [4, { ...FREE_ARC, hasMembership: true }, 409, 'LINKED_USER_ALREADY_MEMBER'],
    [5, { ...FREE_ARC, isActive: false }, 409, 'LINKED_USER_INACTIVE'],
    [6, { ...FREE_ARC, roleId: 0, isActive: false }, 403, 'CANNOT_LINK_OMEGA_USER'],
  ])(
    'fila %i: puerta en la TX ⇒ %i %s y ROLLBACK sin residuos',
    async (_row, recipient, status, code) => {
      vi.mocked(lockRecipient).mockResolvedValue(recipient);
      expect(await acceptInvitation(RECIPIENT, 77)).toMatchObject({ status, code });
      expectNothingWritten();
    }
  );

  it('el destinatario desapareció ⇒ 404 de la puerta y ROLLBACK', async () => {
    vi.mocked(lockRecipient).mockResolvedValue(null);
    expect(await acceptInvitation(RECIPIENT, 77)).toMatchObject({
      status: 404,
      code: 'LINKED_USER_NOT_FOUND',
    });
    expectNothingWritten();
  });

  it('fila 7: bloqueo ⇒ 403 BLOCKED_USER, la invitación queda CANCELED (COMMIT) sin altas', async () => {
    vi.mocked(Relations.isBlockedEitherWay).mockResolvedValue(true);
    expect(await acceptInvitation(RECIPIENT, 77)).toMatchObject({
      status: 403,
      code: 'BLOCKED_USER',
    });
    expect(Invitations.setInvitationStatus).toHaveBeenCalledWith(77, 'CANCELED', conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(Relations.insertContact).not.toHaveBeenCalled();
    expect(insertTypedMembership).not.toHaveBeenCalled();
  });

  it('fila 8: vencida ⇒ 410 y queda EXPIRED (COMMIT)', async () => {
    vi.mocked(Invitations.lockInvitation).mockResolvedValue({ ...PENDING, expired: true });
    expect(await acceptInvitation(RECIPIENT, 77)).toMatchObject({
      status: 410,
      code: 'INVITATION_EXPIRED',
    });
    expect(Invitations.setInvitationStatus).toHaveBeenCalledWith(77, 'EXPIRED', conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(Relations.isBlockedEitherWay).not.toHaveBeenCalled();
  });

  it('fila 9: no PENDING ⇒ 409, antes de evaluar la caducidad', async () => {
    vi.mocked(Invitations.lockInvitation).mockResolvedValue({
      ...PENDING,
      status: 'ACCEPTED',
      expired: true,
    });
    expect(await acceptInvitation(RECIPIENT, 77)).toMatchObject({
      status: 409,
      code: 'INVITATION_NOT_PENDING',
    });
    expect(Invitations.setInvitationStatus).not.toHaveBeenCalled();
  });

  it('fila 10: la sesión no es la del destinatario ⇒ 403 (ni el emisor puede aceptar)', async () => {
    expect(await acceptInvitation(SENDER, 77)).toMatchObject({
      status: 403,
      code: 'FORBIDDEN_INVITATION_RECIPIENT',
    });
    expectNothingWritten();
  });

  it('invitación inexistente ⇒ 404', async () => {
    vi.mocked(Invitations.lockInvitation).mockResolvedValue(null);
    expect(await acceptInvitation(RECIPIENT, 1)).toMatchObject({
      status: 404,
      code: 'INVITATION_NOT_FOUND',
    });
  });

  it('sin rol Arc sembrado ⇒ lanza y revierte', async () => {
    vi.mocked(findArcCosmonautRoleId).mockResolvedValue(null);
    await expect(acceptInvitation(RECIPIENT, 77)).rejects.toThrow('rol Arc no configurado');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});

describe('rechazar y cancelar', () => {
  it('el destinatario rechaza ⇒ REJECTED', async () => {
    expect(await closeInvitation(RECIPIENT, 77, 'REJECT')).toEqual({
      ok: true,
      status: 'REJECTED',
    });
    expect(Invitations.setInvitationStatus).toHaveBeenCalledWith(77, 'REJECTED', conn);
    expect(conn.commit).toHaveBeenCalled();
  });

  it('el emisor cancela ⇒ CANCELED; el destinatario no puede cancelar', async () => {
    expect(await closeInvitation(SENDER, 77, 'CANCEL')).toEqual({ ok: true, status: 'CANCELED' });
    expect(await closeInvitation(RECIPIENT, 77, 'CANCEL')).toMatchObject({
      status: 403,
      code: 'FORBIDDEN_INVITATION_SENDER',
    });
  });

  it('una vencida no se rechaza: queda EXPIRED con 410', async () => {
    vi.mocked(Invitations.lockInvitation).mockResolvedValue({ ...PENDING, expired: true });
    expect(await closeInvitation(RECIPIENT, 77, 'REJECT')).toMatchObject({ status: 410 });
    expect(Invitations.setInvitationStatus).toHaveBeenCalledWith(77, 'EXPIRED', conn);
  });
});

describe('bloquear', () => {
  it('bloquea, cancela las PENDING en ambos sentidos y retira el contacto, en una TX', async () => {
    expect(await blockUser(SENDER, RECIPIENT)).toEqual({ ok: true });
    expect(Relations.insertBlock).toHaveBeenCalledWith(SENDER, RECIPIENT, conn);
    expect(Invitations.cancelPendingBetween).toHaveBeenCalledWith(SENDER, RECIPIENT, conn);
    expect(Relations.deleteContact).toHaveBeenCalledWith(SENDER, RECIPIENT, conn);
    expect(conn.commit).toHaveBeenCalled();
  });

  it('a uno mismo ⇒ 400; a un usuario inexistente ⇒ 404, sin TX', async () => {
    expect(await blockUser(SENDER, SENDER)).toMatchObject({
      status: 400,
      code: 'CANNOT_BLOCK_SELF',
    });
    vi.mocked(Relations.userExists).mockResolvedValue(false);
    expect(await blockUser(SENDER, 404)).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});
