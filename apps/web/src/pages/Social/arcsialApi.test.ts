import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../api/client';
import {
  blockUser,
  describeArcsialError,
  describeExpiry,
  fetchBlocks,
  fetchContacts,
  fetchInvitations,
  fetchOwnProfile,
  lookupHandle,
  normalizeHandle,
  respondInvitation,
  sendInvitation,
  updateOwnHandle,
} from './arcsialApi';

/** FC209 F3 — cliente web de Arcsial: rutas, cuerpos, extracción de la respuesta y mensajes. */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('lecturas', () => {
  it('perfil propio, contactos, bloqueados y bandeja salen de su campo', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { success: true, id: 3, handle: 'mu', muUniverse: null } })
      .mockResolvedValueOnce({ data: { success: true, contacts: [{ id: 9 }] } })
      .mockResolvedValueOnce({ data: { success: true, blocks: [{ blockedId: 9 }] } })
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 1 }] } });
    expect(await fetchOwnProfile()).toMatchObject({ id: 3, handle: 'mu' });
    expect(await fetchContacts()).toEqual([{ id: 9 }]);
    expect(await fetchBlocks()).toEqual([{ blockedId: 9 }]);
    expect(await fetchInvitations()).toEqual([{ id: 1 }]);
    expect(vi.mocked(api.get).mock.calls.map(([url]) => url)).toEqual([
      '/social/profile',
      '/social/contacts',
      '/social/blocks',
      '/social/invitations',
    ]);
  });

  it('lookup manda el handle como parámetro y devuelve solo la forma pública', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, id: 9, handle: 'ana', displayName: 'Ana', avatarUrl: null },
    });
    expect(await lookupHandle('ana')).toEqual({
      id: 9,
      handle: 'ana',
      displayName: 'Ana',
      avatarUrl: null,
    });
    expect(api.get).toHaveBeenCalledWith('/social/users/lookup', { params: { handle: 'ana' } });
  });
});

describe('escrituras', () => {
  it('handle, invitación, respuestas y bloqueo van a su ruta', async () => {
    await updateOwnHandle('ana_2');
    await sendInvitation('ana', 'UNIVERSE');
    await respondInvitation(77, 'accept');
    await blockUser(9);
    expect(api.patch).toHaveBeenCalledWith('/social/profile/handle', { handle: 'ana_2' });
    expect(api.post).toHaveBeenCalledWith('/social/invitations', {
      recipientHandle: 'ana',
      inviteType: 'UNIVERSE',
    });
    expect(api.post).toHaveBeenCalledWith('/social/invitations/77/accept');
    expect(api.post).toHaveBeenCalledWith('/social/blocks/9');
  });
});

describe('utilidades', () => {
  it.each([
    ['  @Ana_2 ', 'ana_2'],
    ['ana', 'ana'],
  ])('normalizeHandle(%j) = %j', (input, expected) => {
    expect(normalizeHandle(input)).toBe(expected);
  });

  it.each([
    [{ response: { data: { code: 'HANDLE_ALREADY_TAKEN' } } }, 'ya está en uso'],
    [{ response: { data: { code: 'SENDER_NOT_MASTER_OF_UNIVERSE' } } }, 'Master of Universe'],
    [{ response: { data: { code: 'OTRO' } } }, 'No se pudo completar'],
    [new Error('red'), 'No se pudo completar'],
  ])('%#: describeArcsialError', (err, text) => {
    expect(describeArcsialError(err)).toContain(text);
  });

  const NOW = new Date('2026-10-09T12:00:00Z');
  it.each([
    ['2026-10-16T12:00:00Z', 'vence en 7 días'],
    ['2026-10-10T13:00:00Z', 'vence en 1 día'],
    ['2026-10-09T17:30:00Z', 'vence en 5 h'],
    ['2026-10-09T12:20:00Z', 'vence en minutos'],
    ['2026-10-09T11:00:00Z', 'venció'],
    ['no-es-fecha', 'venció'],
  ])('describeExpiry(%s) = %s', (expiresAt, expected) => {
    expect(describeExpiry(expiresAt, NOW)).toBe(expected);
  });

  it('describeExpiry usa la hora actual por defecto', () => {
    expect(describeExpiry('2099-01-01T00:00:00Z')).toMatch(/^vence en \d+ días$/);
  });
});
