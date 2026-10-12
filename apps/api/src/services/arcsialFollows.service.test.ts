import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Actors from './arcsialActors.repository';
import * as Follows from './arcsialFollows.repository';
import { isBlockedEitherWay } from './arcsialRelations.repository';
import { followActor, unfollowActor } from './arcsialFollows.service';
import type { ArcsialActor } from './arcsialActors.repository';

/** FC210 F2 (T1, filas 6–10) — seguimiento: A → D → ¬B → ¬F, con el 404 opaco del bloqueo. */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./arcsialActors.repository', () => ({ findActorByHandle: vi.fn() }));
vi.mock('./arcsialFollows.repository', () => ({ insertFollow: vi.fn(), deleteFollow: vi.fn() }));
vi.mock('./arcsialRelations.repository', () => ({
  areContacts: vi.fn(),
  isBlockedEitherWay: vi.fn(),
}));

const USER_ACTOR = { id: 7, actorType: 'USER', userId: 5, tenantId: null } as ArcsialActor;
const UNIVERSE_ACTOR = {
  id: 8,
  actorType: 'UNIVERSE',
  userId: null,
  tenantId: 41,
  muUserId: 3,
} as ArcsialActor;
const DUP = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
const NOT_FOUND = { status: 404, code: 'ACTOR_NOT_FOUND' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(Actors.findActorByHandle).mockResolvedValue(USER_ACTOR);
  vi.mocked(isBlockedEitherWay).mockResolvedValue(false);
});

describe('followActor', () => {
  it('fila 10 — el actor no existe ⇒ 404', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(null);
    expect(await followActor(3, 'nadie')).toMatchObject(NOT_FOUND);
    expect(Follows.insertFollow).not.toHaveBeenCalled();
  });

  it('fila 9 — seguirse a uno mismo, o el MU a su Universo ⇒ 400, antes de mirar bloqueos', async () => {
    const expected = { status: 400, code: 'CANNOT_FOLLOW_SELF' };
    expect(await followActor(5, 'ana')).toMatchObject(expected);
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(UNIVERSE_ACTOR);
    expect(await followActor(3, 'fms_41')).toMatchObject(expected);
    expect(isBlockedEitherWay).not.toHaveBeenCalled();
    expect(Follows.insertFollow).not.toHaveBeenCalled();
  });

  it('fila 8 — bloqueo en cualquier sentido ⇒ el mismo 404 que si no existiera', async () => {
    vi.mocked(isBlockedEitherWay).mockResolvedValue(true);
    expect(await followActor(3, 'ana')).toMatchObject(NOT_FOUND);
    expect(isBlockedEitherWay).toHaveBeenCalledWith(3, 5);
    expect(Follows.insertFollow).not.toHaveBeenCalled();
  });

  it('fila 7 — ya lo seguía ⇒ 409; otro error de la base se propaga', async () => {
    vi.mocked(Follows.insertFollow).mockRejectedValueOnce(DUP);
    expect(await followActor(3, 'ana')).toMatchObject({ status: 409, code: 'ALREADY_FOLLOWING' });
    vi.mocked(Follows.insertFollow).mockRejectedValueOnce(new Error('down'));
    await expect(followActor(3, 'ana')).rejects.toThrow('down');
  });

  it('fila 6 — éxito hacia una persona y hacia un Universo (sin consultar bloqueos)', async () => {
    expect(await followActor(3, 'ana')).toEqual({ ok: true, following: true });
    expect(Follows.insertFollow).toHaveBeenCalledWith(3, 7);
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(UNIVERSE_ACTOR);
    vi.mocked(isBlockedEitherWay).mockClear();
    expect(await followActor(5, 'fms_41')).toEqual({ ok: true, following: true });
    expect(Follows.insertFollow).toHaveBeenLastCalledWith(5, 8);
    expect(isBlockedEitherWay).not.toHaveBeenCalled();
  });
});

describe('unfollowActor', () => {
  it('actor inexistente ⇒ 404; existente ⇒ borra aunque no lo siguiera', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValueOnce(null);
    expect(await unfollowActor(3, 'nadie')).toMatchObject(NOT_FOUND);
    expect(await unfollowActor(3, 'ana')).toEqual({ ok: true, following: false });
    expect(Follows.deleteFollow).toHaveBeenCalledTimes(1);
    expect(Follows.deleteFollow).toHaveBeenCalledWith(3, 7);
  });
});
