import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import db from './db';
import * as Actors from './arcsialActors.repository';
import * as Follows from './arcsialFollows.repository';
import { areContacts, isBlockedEitherWay } from './arcsialRelations.repository';
import { UniverseMutationError } from './universeLabel';
import {
  createActorForNewUniverse,
  findVisibleActor,
  getActor,
  inActorTransaction,
  isActorOwner,
  resolveActingActor,
  searchActors,
  updateActorProfile,
} from './arcsialActors.service';
import type { ArcsialActor } from './arcsialActors.repository';

/**
 * FC210 F2 — actores: 404 opaco ante bloqueo (solo personas), `isSearchable` solo para el dueño, alcance
 * del PATCH de perfil (R 560_AN) y alta del actor de un Universo nuevo con rollback fail-closed.
 */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./arcsialActors.repository', () => ({
  findActorByHandle: vi.fn(),
  findActorByUserId: vi.fn(),
  findActorByTenantId: vi.fn(),
  insertUniverseActor: vi.fn(),
  updateActorProfile: vi.fn(),
  updateProfilePresentation: vi.fn(),
  searchActorsByName: vi.fn(),
}));
vi.mock('./arcsialFollows.repository', () => ({
  countFollowers: vi.fn(),
  countFollowing: vi.fn(),
  isFollowing: vi.fn(),
}));
vi.mock('./arcsialRelations.repository', () => ({
  areContacts: vi.fn(),
  isBlockedEitherWay: vi.fn(),
}));

const USER_ACTOR: ArcsialActor = {
  id: 7,
  actorType: 'USER',
  userId: 5,
  tenantId: null,
  handle: 'ana',
  displayName: 'Ana',
  avatarUrl: null,
  bio: 'Hola',
  isSearchable: true,
  muUserId: null,
};
const UNIVERSE_ACTOR: ArcsialActor = {
  ...USER_ACTOR,
  id: 8,
  actorType: 'UNIVERSE',
  userId: null,
  tenantId: 41,
  handle: 'fms_41',
  displayName: 'Flota Norte',
  bio: null,
  muUserId: 3,
};
const DUP = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};
const conn = connection as unknown as PoolConnection;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.getConnection).mockResolvedValue(conn);
  vi.mocked(Follows.countFollowers).mockResolvedValue(12);
  vi.mocked(Follows.countFollowing).mockResolvedValue(4);
  vi.mocked(Follows.isFollowing).mockResolvedValue(false);
  vi.mocked(areContacts).mockResolvedValue(false);
  vi.mocked(isBlockedEitherWay).mockResolvedValue(false);
});

describe('isActorOwner', () => {
  it('una persona es dueña de su actor; de un Universo, solo su MU', () => {
    expect(isActorOwner(USER_ACTOR, 5)).toBe(true);
    expect(isActorOwner(USER_ACTOR, 3)).toBe(false);
    expect(isActorOwner(UNIVERSE_ACTOR, 3)).toBe(true);
    expect(isActorOwner(UNIVERSE_ACTOR, 5)).toBe(false);
    expect(isActorOwner({ ...UNIVERSE_ACTOR, muUserId: null }, 5)).toBe(false);
  });
});

describe('findVisibleActor', () => {
  it('inexistente ⇒ null sin mirar bloqueos', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(null);
    expect(await findVisibleActor(3, 'nadie')).toBeNull();
    expect(isBlockedEitherWay).not.toHaveBeenCalled();
  });

  it('persona con bloqueo en cualquier sentido ⇒ null; compara users.id', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(USER_ACTOR);
    vi.mocked(isBlockedEitherWay).mockResolvedValue(true);
    expect(await findVisibleActor(3, 'ana')).toBeNull();
    expect(isBlockedEitherWay).toHaveBeenCalledWith(3, 5);
  });

  it('un Universo no se esconde por bloqueos: ni siquiera se consultan (R 562_AN)', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(UNIVERSE_ACTOR);
    vi.mocked(isBlockedEitherWay).mockResolvedValue(true);
    expect(await findVisibleActor(5, 'fms_41')).toEqual(UNIVERSE_ACTOR);
    expect(isBlockedEitherWay).not.toHaveBeenCalled();
  });
});

describe('resolveActingActor', () => {
  it('sin Universo: el actor de la sesión', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue(USER_ACTOR);
    expect(await resolveActingActor(5)).toEqual(USER_ACTOR);
    expect(Actors.findActorByTenantId).not.toHaveBeenCalled();
  });

  it('con Universo: solo si la sesión es su MU', async () => {
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(UNIVERSE_ACTOR);
    expect(await resolveActingActor(3, 41)).toEqual(UNIVERSE_ACTOR);
    expect(await resolveActingActor(5, 41)).toBeNull();
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(null);
    expect(await resolveActingActor(3, 99)).toBeNull();
  });
});

describe('getActor', () => {
  it('inexistente o bloqueado ⇒ el mismo 404 ACTOR_NOT_FOUND', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValueOnce(null);
    const missing = await getActor(3, 'nadie');
    vi.mocked(Actors.findActorByHandle).mockResolvedValueOnce(USER_ACTOR);
    vi.mocked(isBlockedEitherWay).mockResolvedValueOnce(true);
    const blocked = await getActor(3, 'ana');
    expect(missing).toMatchObject({ status: 404, code: 'ACTOR_NOT_FOUND' });
    expect(blocked).toEqual(missing);
  });

  it('visitante: contadores y relación, SIN isSearchable', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(USER_ACTOR);
    vi.mocked(Follows.isFollowing).mockResolvedValue(true);
    vi.mocked(areContacts).mockResolvedValue(true);
    const view = await getActor(3, 'ana');
    expect(view).toEqual({
      ok: true,
      id: 7,
      actorType: 'USER',
      handle: 'ana',
      displayName: 'Ana',
      avatarUrl: null,
      bio: 'Hola',
      followersCount: 12,
      followingCount: 4,
      isFollowedByMe: true,
      isContact: true,
    });
    expect(view).not.toHaveProperty('isSearchable');
    expect(Follows.countFollowing).toHaveBeenCalledWith(5);
    expect(areContacts).toHaveBeenCalledWith(3, 5);
  });

  it('el dueño ve su isSearchable', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue({ ...USER_ACTOR, isSearchable: false });
    expect(await getActor(5, 'ana')).toMatchObject({ isSearchable: false });
  });

  it('Universo: no sigue a nadie ni es contacto; su MU ve isSearchable', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(UNIVERSE_ACTOR);
    const asVisitor = await getActor(5, 'fms_41');
    expect(asVisitor).toMatchObject({ actorType: 'UNIVERSE', followingCount: 0, isContact: false });
    expect(asVisitor).not.toHaveProperty('isSearchable');
    expect(Follows.countFollowing).not.toHaveBeenCalled();
    expect(areContacts).not.toHaveBeenCalled();
    expect(await getActor(3, 'fms_41')).toMatchObject({ isSearchable: true });
  });
});

describe('searchActors', () => {
  it('devuelve las tarjetas del repositorio para la sesión', async () => {
    const card = { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' as const };
    vi.mocked(Actors.searchActorsByName).mockResolvedValue([card]);
    expect(await searchActors(3, 'ana')).toEqual({ ok: true, actors: [card] });
    expect(Actors.searchActorsByName).toHaveBeenCalledWith(3, 'ana');
  });
});

describe('inActorTransaction', () => {
  it('confirma al terminar y libera la conexión', async () => {
    const work = vi.fn().mockResolvedValue(undefined);
    await inActorTransaction(work);
    expect(work).toHaveBeenCalledWith(conn);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('si el trabajo lanza, revierte, libera y propaga', async () => {
    await expect(inActorTransaction(() => Promise.reject(new Error('down')))).rejects.toThrow(
      'down'
    );
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});

describe('updateActorProfile', () => {
  it('sin Universo y sin actor ⇒ 404; con Universo sin ser su MU ⇒ 403, sin escribir', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue(null);
    expect(await updateActorProfile(5, { bio: 'x' })).toMatchObject({ status: 404 });
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(UNIVERSE_ACTOR);
    expect(await updateActorProfile(5, { bio: 'x' }, 41)).toMatchObject({
      status: 403,
      code: 'FORBIDDEN_NOT_UNIVERSE_MASTER',
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('persona: los campos ausentes conservan su valor y el perfil espejo cambia en la misma TX', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue(USER_ACTOR);
    const result = await updateActorProfile(5, { displayName: 'Ana P', isSearchable: false });
    const profile = { displayName: 'Ana P', bio: 'Hola', avatarUrl: null, isSearchable: false };
    expect(result).toEqual({ ok: true, handle: 'ana', ...profile });
    expect(Actors.updateActorProfile).toHaveBeenCalledWith(7, profile, conn);
    expect(Actors.updateProfilePresentation).toHaveBeenCalledWith(5, profile, conn);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  it('bio y avatar aceptan null explícito (borrar)', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue({
      ...USER_ACTOR,
      avatarUrl: 'https://cdn.example/a.png',
    });
    expect(await updateActorProfile(5, { bio: null, avatarUrl: null })).toMatchObject({
      bio: null,
      avatarUrl: null,
      displayName: 'Ana',
      isSearchable: true,
    });
    expect(
      await updateActorProfile(5, { bio: 'Nueva', avatarUrl: 'https://cdn.example/b.png' })
    ).toMatchObject({ bio: 'Nueva', avatarUrl: 'https://cdn.example/b.png' });
  });

  it('Universo por su MU: solo el actor, sin perfil espejo', async () => {
    vi.mocked(Actors.findActorByTenantId).mockResolvedValue(UNIVERSE_ACTOR);
    expect(await updateActorProfile(3, { bio: 'Flotilla' }, 41)).toMatchObject({
      ok: true,
      handle: 'fms_41',
      bio: 'Flotilla',
    });
    expect(Actors.updateActorProfile).toHaveBeenCalledTimes(1);
    expect(Actors.updateProfilePresentation).not.toHaveBeenCalled();
  });
});

describe('createActorForNewUniverse', () => {
  const tenant = { id: 41, handle: 'FMS-41AB3C', label: 'Flota Norte' };

  it('normaliza el handle del tenant e inserta el actor en la TX del llamador', async () => {
    await createActorForNewUniverse(tenant, conn);
    expect(Actors.insertUniverseActor).toHaveBeenCalledWith(
      { tenantId: 41, handle: 'fms_41ab3c', displayName: 'Flota Norte' },
      conn
    );
  });

  it('recorta el nombre visible a 100 caracteres', async () => {
    await createActorForNewUniverse({ ...tenant, label: 'x'.repeat(255) }, conn);
    expect(vi.mocked(Actors.insertUniverseActor).mock.calls[0][0].displayName).toHaveLength(100);
  });

  it.each([
    ['fuera de patrón', 'A.B'],
    ['reservado', 'SAT'],
  ])('handle %s ⇒ lanza UNIVERSE_HANDLE_UNAVAILABLE sin insertar', async (_case, handle) => {
    const attempt = createActorForNewUniverse({ ...tenant, handle }, conn);
    await expect(attempt).rejects.toBeInstanceOf(UniverseMutationError);
    await expect(attempt).rejects.toMatchObject({
      failure: { status: 409, code: 'UNIVERSE_HANDLE_UNAVAILABLE' },
    });
    expect(Actors.insertUniverseActor).not.toHaveBeenCalled();
  });

  it('handle que ya tiene otro actor ⇒ el mismo fallo; otro error se propaga', async () => {
    vi.mocked(Actors.insertUniverseActor).mockRejectedValueOnce(DUP);
    await expect(createActorForNewUniverse(tenant, conn)).rejects.toMatchObject({
      failure: { code: 'UNIVERSE_HANDLE_UNAVAILABLE' },
    });
    vi.mocked(Actors.insertUniverseActor).mockRejectedValueOnce(new Error('FK'));
    await expect(createActorForNewUniverse(tenant, conn)).rejects.toThrow('FK');
  });
});
