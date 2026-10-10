import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import {
  changeOwnHandle,
  getOwnProfile,
  listOwnBlocks,
  listOwnContacts,
  lookupByHandle,
} from '../services/arcsialProfiles.service';
import { issueInvitation, listInvitations } from '../services/arcsialInvitations.service';
import { acceptInvitation, blockUser, closeInvitation } from '../services/arcsialResponses.service';

/**
 * FC209 F2 — cableado de `/v1/social/*` de Arcsial en la app real: sesión obligatoria, validación del
 * handle (sin `@`, minúsculas) y traducción del resultado del servicio a HTTP. La lógica de T1/T2 se
 * prueba en los servicios.
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));
vi.mock('../services/arcsialProfiles.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/arcsialProfiles.service')>()),
  lookupByHandle: vi.fn(),
  changeOwnHandle: vi.fn(),
  getOwnProfile: vi.fn(),
  listOwnContacts: vi.fn(),
  listOwnBlocks: vi.fn(),
}));
vi.mock('../services/arcsialInvitations.service', () => ({
  issueInvitation: vi.fn(),
  listInvitations: vi.fn(),
}));
vi.mock('../services/arcsialResponses.service', () => ({
  acceptInvitation: vi.fn(),
  closeInvitation: vi.fn(),
  blockUser: vi.fn(),
}));

const NOT_FOUND = { ok: false as const, status: 404, code: 'USER_NOT_FOUND', message: 'x' };

describe('FC209 F2 — rutas de Arcsial', () => {
  const app = buildApp();
  let auth: Record<string, string>;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (p: object) => string } };
    auth = {
      authorization: `Bearer ${jwt.sign({ id: 3, username: 'arc', roleId: 2, permissions: [] })}`,
    };
  });

  beforeEach(() => vi.clearAllMocks());

  /** Atajo de inyección con la sesión de prueba. */
  async function call(
    method: 'GET' | 'POST' | 'PATCH',
    url: string,
    payload?: object
  ): Promise<{ statusCode: number; json: () => Record<string, unknown> }> {
    return app.inject({ method, url, headers: auth, payload });
  }

  it('sin sesión ⇒ 401 y ningún servicio se llama', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/social/invitations' });
    expect(res.statusCode).toBe(401);
    expect(listInvitations).not.toHaveBeenCalled();
  });

  it.each(['ana@piic.mx', 'ab', 'a.b', 'a-b', ''])(
    'lookup con handle inválido (%s) ⇒ 400 sin consultar',
    async (handle) => {
      const res = await call('GET', `/v1/social/users/lookup?handle=${encodeURIComponent(handle)}`);
      expect(res.statusCode).toBe(400);
      expect(lookupByHandle).not.toHaveBeenCalled();
    }
  );

  it('lookup normaliza a minúsculas y devuelve el perfil público; el 404 del servicio pasa tal cual', async () => {
    const profile = { id: 9, handle: 'ana', displayName: 'Ana', avatarUrl: null };
    vi.mocked(lookupByHandle).mockResolvedValueOnce({ ok: true, ...profile });
    const res = await call('GET', '/v1/social/users/lookup?handle=%20ANA%20');
    expect(res.statusCode).toBe(200);
    // FC209 — forma del contrato: { id, handle, displayName, avatarUrl } (sin anidar, sin correo).
    expect(res.json()).toEqual({ success: true, ...profile });
    expect(lookupByHandle).toHaveBeenCalledWith(3, 'ana');
    vi.mocked(lookupByHandle).mockResolvedValueOnce(NOT_FOUND);
    const missing = await call('GET', '/v1/social/users/lookup?handle=nadie');
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ success: false, code: 'USER_NOT_FOUND' });
  });

  it('FC209 F3: perfil, contactos y bloqueos propios, siempre de la sesión', async () => {
    const own = {
      id: 3,
      handle: 'mu_norte',
      displayName: 'Mu',
      avatarUrl: null,
      muUniverse: { id: 41, label: 'Flota Norte' },
    };
    vi.mocked(getOwnProfile).mockResolvedValue({ ok: true, ...own });
    vi.mocked(listOwnContacts).mockResolvedValue({ ok: true, contacts: [] });
    vi.mocked(listOwnBlocks).mockResolvedValue({ ok: true, blocks: [] });
    expect((await call('GET', '/v1/social/profile')).json()).toEqual({ success: true, ...own });
    expect((await call('GET', '/v1/social/contacts')).json()).toEqual({
      success: true,
      contacts: [],
    });
    expect((await call('GET', '/v1/social/blocks')).json()).toEqual({ success: true, blocks: [] });
    expect(getOwnProfile).toHaveBeenCalledWith(3);
    expect(listOwnContacts).toHaveBeenCalledWith(3);
    expect(listOwnBlocks).toHaveBeenCalledWith(3);
    vi.mocked(getOwnProfile).mockResolvedValue(NOT_FOUND);
    expect((await call('GET', '/v1/social/profile')).statusCode).toBe(404);
  });

  it('PATCH handle: valida y delega', async () => {
    expect((await call('PATCH', '/v1/social/profile/handle', { handle: 'a@b' })).statusCode).toBe(
      400
    );
    vi.mocked(changeOwnHandle).mockResolvedValue({ ok: true, handle: 'ana_2' });
    const res = await call('PATCH', '/v1/social/profile/handle', { handle: 'Ana_2' });
    expect(res.statusCode).toBe(200);
    expect(changeOwnHandle).toHaveBeenCalledWith(3, 'ana_2');
  });

  it('POST invitación: 201 con el token; tipo o handle inválidos ⇒ 400', async () => {
    const issued = {
      ok: true as const,
      id: 77,
      inviteType: 'CONTACT' as const,
      expiresAt: 'x',
      inviteToken: 't',
    };
    vi.mocked(issueInvitation).mockResolvedValue(issued);
    const res = await call('POST', '/v1/social/invitations', {
      recipientHandle: 'ana',
      inviteType: 'CONTACT',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      success: true,
      id: 77,
      inviteType: 'CONTACT',
      expiresAt: 'x',
      inviteToken: 't',
    });
    expect(issueInvitation).toHaveBeenCalledWith(3, 'ana', 'CONTACT');
    expect(
      (await call('POST', '/v1/social/invitations', { recipientHandle: 'ana', inviteType: 'MU' }))
        .statusCode
    ).toBe(400);
    expect(
      (
        await call('POST', '/v1/social/invitations', {
          recipientHandle: 'a@b.mx',
          inviteType: 'CONTACT',
        })
      ).statusCode
    ).toBe(400);
  });

  it('GET invitaciones lista para la sesión', async () => {
    vi.mocked(listInvitations).mockResolvedValue([]);
    const res = await call('GET', '/v1/social/invitations');
    expect(res.json()).toEqual({ success: true, data: [] });
    expect(listInvitations).toHaveBeenCalledWith(3);
  });

  it('aceptar, rechazar y cancelar: id numérico positivo y el código del servicio', async () => {
    vi.mocked(acceptInvitation).mockResolvedValue({ ok: true, status: 'ACCEPTED', tenantId: 41 });
    expect((await call('POST', '/v1/social/invitations/77/accept')).json()).toEqual({
      success: true,
      status: 'ACCEPTED',
      tenantId: 41,
    });
    expect(acceptInvitation).toHaveBeenCalledWith(3, 77);
    expect((await call('POST', '/v1/social/invitations/abc/accept')).statusCode).toBe(400);

    vi.mocked(closeInvitation).mockResolvedValue({
      ok: false,
      status: 410,
      code: 'INVITATION_EXPIRED',
      message: 'x',
    });
    expect((await call('POST', '/v1/social/invitations/77/reject')).statusCode).toBe(410);
    expect(closeInvitation).toHaveBeenCalledWith(3, 77, 'REJECT');
    await call('POST', '/v1/social/invitations/77/cancel');
    expect(closeInvitation).toHaveBeenLastCalledWith(3, 77, 'CANCEL');
    expect((await call('POST', '/v1/social/invitations/0/cancel')).statusCode).toBe(400);
  });

  it('bloquear: id válido y delega', async () => {
    vi.mocked(blockUser).mockResolvedValue({ ok: true });
    expect((await call('POST', '/v1/social/blocks/9')).json()).toEqual({ success: true });
    expect(blockUser).toHaveBeenCalledWith(3, 9);
    expect((await call('POST', '/v1/social/blocks/-1')).statusCode).toBe(400);
  });
});
