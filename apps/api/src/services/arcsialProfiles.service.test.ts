import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import * as Profiles from './arcsialProfiles.repository';
import { isBlockedEitherWay } from './arcsialRelations.repository';
import { isReservedHandle } from './arcsialHandle';
import { insertUserActor } from './arcsialActors.repository';
import {
  createProfileForNewUser,
  getOwnProfile,
  isDuplicateEntry,
  listOwnBlocks,
  listOwnContacts,
  lookupByHandle,
} from './arcsialProfiles.service';

/** FC209 F2 / FC210 F2 — alta del actor y del perfil en el registro, y búsqueda con 404 opaco. */

vi.mock('./arcsialProfiles.repository', () => ({
  findUserUuid: vi.fn(),
  insertProfile: vi.fn(),
  findProfileByHandle: vi.fn(),
  findProfileByUserId: vi.fn(),
  findMuUniverse: vi.fn(),
  listContacts: vi.fn(),
  listBlocks: vi.fn(),
}));
vi.mock('./arcsialRelations.repository', () => ({ isBlockedEitherWay: vi.fn() }));
vi.mock('./arcsialActors.repository', () => ({ insertUserActor: vi.fn() }));
vi.mock('./arcsialHandle', async (importOriginal) => {
  const original = await importOriginal<typeof import('./arcsialHandle')>();
  return { ...original, isReservedHandle: vi.fn(original.isReservedHandle) };
});

const conn = {} as PoolConnection;
const DUP = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
const UUID = 'abcdef01-2345-4789-8abc-def012345678';
const PROFILE = { userId: 9, handle: 'ana', displayName: 'Ana', avatarUrl: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Profiles.findUserUuid).mockResolvedValue(UUID);
});

describe('createProfileForNewUser', () => {
  it('toma arc_ + 8 hex y el nombre completo; el actor USER entra antes que el perfil', async () => {
    expect(await createProfileForNewUser(5, 'Ana Pérez', conn)).toBe('arc_abcdef01');
    const row = { userId: 5, handle: 'arc_abcdef01', displayName: 'Ana Pérez' };
    expect(insertUserActor).toHaveBeenCalledWith(row, conn);
    expect(Profiles.insertProfile).toHaveBeenCalledWith(row, conn);
    expect(vi.mocked(insertUserActor).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(Profiles.insertProfile).mock.invocationCallOrder[0]
    );
  });

  it('FC210: un candidato reservado se salta igual que uno tomado, sin tocar la base', async () => {
    vi.mocked(isReservedHandle).mockReturnValueOnce(true);
    expect(await createProfileForNewUser(5, 'Ana', conn)).toBe('arc_abcdef012345');
    expect(insertUserActor).toHaveBeenCalledTimes(1);
    expect(vi.mocked(insertUserActor).mock.calls[0][0].handle).toBe('arc_abcdef012345');
  });

  it('FC210: un handle que ya tiene otro actor (p. ej. un Universo) pasa al siguiente', async () => {
    vi.mocked(insertUserActor).mockRejectedValueOnce(DUP);
    expect(await createProfileForNewUser(5, 'Ana', conn)).toBe('arc_abcdef012345');
    expect(Profiles.insertProfile).toHaveBeenCalledTimes(1);
  });

  it('ante handle tomado prueba 12, 16 y 26, en orden', async () => {
    vi.mocked(Profiles.insertProfile)
      .mockRejectedValueOnce(DUP)
      .mockRejectedValueOnce(DUP)
      .mockResolvedValueOnce(undefined);
    expect(await createProfileForNewUser(5, '', conn)).toBe('arc_abcdef0123454789');
    const handles = vi.mocked(Profiles.insertProfile).mock.calls.map(([p]) => p.handle);
    expect(handles).toEqual(['arc_abcdef01', 'arc_abcdef012345', 'arc_abcdef0123454789']);
    expect(vi.mocked(Profiles.insertProfile).mock.calls[2][0].displayName).toBe(
      'arc_abcdef0123454789'
    );
  });

  it('si los cuatro chocan, lanza (la TX del registro revierte)', async () => {
    vi.mocked(Profiles.insertProfile).mockRejectedValue(DUP);
    await expect(createProfileForNewUser(5, 'Ana', conn)).rejects.toThrow('sin handle libre');
    expect(Profiles.insertProfile).toHaveBeenCalledTimes(4);
  });

  it('otro error no se traga y sin uuid no hay perfil', async () => {
    vi.mocked(Profiles.insertProfile).mockRejectedValueOnce(new Error('FK'));
    await expect(createProfileForNewUser(5, 'Ana', conn)).rejects.toThrow('FK');
    vi.mocked(Profiles.findUserUuid).mockResolvedValueOnce(null);
    await expect(createProfileForNewUser(5, 'Ana', conn)).rejects.toThrow('no tiene uuid');
  });
});

describe('isDuplicateEntry', () => {
  it.each([
    [DUP, true],
    [new Error('x'), false],
    [null, false],
  ])('%#', (error, expected) => {
    expect(isDuplicateEntry(error)).toBe(expected);
  });
});

describe('lookupByHandle', () => {
  it('handle inexistente ⇒ 404 opaco, sin mirar bloqueos', async () => {
    vi.mocked(Profiles.findProfileByHandle).mockResolvedValue(null);
    expect(await lookupByHandle(3, 'nadie')).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
    expect(isBlockedEitherWay).not.toHaveBeenCalled();
  });

  it('con bloqueo en cualquier sentido ⇒ el mismo 404', async () => {
    vi.mocked(Profiles.findProfileByHandle).mockResolvedValue(PROFILE);
    vi.mocked(isBlockedEitherWay).mockResolvedValue(true);
    expect(await lookupByHandle(3, 'ana')).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
    expect(isBlockedEitherWay).toHaveBeenCalledWith(3, 9);
  });

  it('visible ⇒ el perfil público', async () => {
    vi.mocked(Profiles.findProfileByHandle).mockResolvedValue(PROFILE);
    vi.mocked(isBlockedEitherWay).mockResolvedValue(false);
    expect(await lookupByHandle(3, 'ana')).toEqual({
      ok: true,
      id: 9,
      handle: 'ana',
      displayName: 'Ana',
      avatarUrl: null,
    });
  });
});

describe('FC209 F3 — lecturas propias', () => {
  it('getOwnProfile: forma pública + Universo donde es MU; 404 sin perfil', async () => {
    vi.mocked(Profiles.findProfileByUserId).mockResolvedValueOnce(PROFILE);
    vi.mocked(Profiles.findMuUniverse).mockResolvedValueOnce({ id: 41, label: 'Flota Norte' });
    expect(await getOwnProfile(9)).toEqual({
      ok: true,
      id: 9,
      handle: 'ana',
      displayName: 'Ana',
      avatarUrl: null,
      muUniverse: { id: 41, label: 'Flota Norte' },
    });
    vi.mocked(Profiles.findProfileByUserId).mockResolvedValueOnce(null);
    expect(await getOwnProfile(9)).toMatchObject({ status: 404 });
  });

  it('contactos y bloqueos del usuario', async () => {
    vi.mocked(Profiles.listContacts).mockResolvedValue([]);
    vi.mocked(Profiles.listBlocks).mockResolvedValue([]);
    expect(await listOwnContacts(9)).toEqual({ ok: true, contacts: [] });
    expect(await listOwnBlocks(9)).toEqual({ ok: true, blocks: [] });
    expect(Profiles.listContacts).toHaveBeenCalledWith(9);
    expect(Profiles.listBlocks).toHaveBeenCalledWith(9);
  });
});
