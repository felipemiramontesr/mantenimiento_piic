import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import db from './db';
import * as Actors from './arcsialActors.repository';
import * as Follows from './arcsialFollows.repository';
import * as Posts from './arcsialPosts.repository';

/**
 * FC210 F2 — SQL de los repositorios del núcleo social (actores, seguimientos y publicaciones) con un
 * executor simulado: forma de la consulta, orden de parámetros y mapeo de filas.
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

const ACTOR_ROW = {
  id: 7,
  actorType: 'USER',
  userId: 5,
  tenantId: null,
  handle: 'ana',
  displayName: 'Ana',
  avatarUrl: null,
  bio: null,
  isSearchable: 1,
  muUserId: null,
};

beforeEach(() => {
  execute.mockReset();
  vi.mocked(db.execute).mockReset();
});

describe('arcsialActors.repository', () => {
  it('busca por handle exacto, por usuario y por tenant; is_searchable llega como booleano', async () => {
    rows([ACTOR_ROW], [{ ...ACTOR_ROW, isSearchable: 0 }], []);
    expect(await Actors.findActorByHandle('ana', conn)).toEqual({
      ...ACTOR_ROW,
      isSearchable: true,
    });
    expect((await Actors.findActorByUserId(5, conn))?.isSearchable).toBe(false);
    expect(await Actors.findActorByTenantId(41, conn)).toBeNull();
    expect(call(0).sql).toContain('WHERE a.handle = ?');
    expect(call(0).sql).toContain('t.mu_user_id AS muUserId');
    expect(call(1).sql).toContain('WHERE a.user_id = ?');
    expect(call(2)).toMatchObject({ params: [41] });
    expect(call(2).sql).toContain('WHERE a.tenant_id = ?');
  });

  it('sin executor usa el pool', async () => {
    vi.mocked(db.execute).mockResolvedValue([[], []] as never);
    expect(await Actors.findActorByHandle('ana')).toBeNull();
    expect(await Actors.findActorByUserId(5)).toBeNull();
    expect(await Actors.findActorByTenantId(41)).toBeNull();
    expect(await Actors.searchActorsByName(3, 'ana')).toEqual([]);
    expect(db.execute).toHaveBeenCalledTimes(4);
  });

  it('alta de actor USER y UNIVERSE con el tipo fijo en el SQL', async () => {
    rows([], []);
    await Actors.insertUserActor({ userId: 5, handle: 'ana', displayName: 'Ana' }, conn);
    await Actors.insertUniverseActor(
      { tenantId: 41, handle: 'fms_41', displayName: 'Flota' },
      conn
    );
    expect(call(0).sql).toContain("VALUES ('USER', ?, ?, ?)");
    expect(call(0).params).toEqual([5, 'ana', 'Ana']);
    expect(call(1).sql).toContain("VALUES ('UNIVERSE', ?, ?, ?)");
    expect(call(1).params).toEqual([41, 'fms_41', 'Flota']);
  });

  it('handle y presentación: el actor y su espejo en arcsial_profiles', async () => {
    rows([], [], [], [], []);
    await Actors.updateActorHandle(7, 'ana_2', conn);
    await Actors.updateProfileHandle(5, 'ana_2', conn);
    const profile = { displayName: 'Ana P', bio: 'Hola', avatarUrl: null, isSearchable: false };
    await Actors.updateActorProfile(7, profile, conn);
    await Actors.updateActorProfile(7, { ...profile, isSearchable: true }, conn);
    await Actors.updateProfilePresentation(5, profile, conn);
    expect(call(0)).toMatchObject({ params: ['ana_2', 7] });
    expect(call(1).sql).toContain('UPDATE arcsial_profiles SET handle = ?');
    expect(call(1).params).toEqual(['ana_2', 5]);
    expect(call(2).params).toEqual(['Ana P', 'Hola', null, 0, 7]);
    expect(call(3).params[3]).toBe(1);
    expect(call(4).params).toEqual(['Ana P', null, 5]);
  });

  it('búsqueda por nombre: solo visibles, sin bloqueados, máximo 10 y comodines escapados', async () => {
    const card = { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' };
    rows([card]);
    expect(await Actors.searchActorsByName(3, '50%_a!b', conn)).toEqual([card]);
    const { sql, params } = call();
    expect(sql).toContain('a.is_searchable = 1');
    expect(sql).toContain('a.display_name LIKE ?');
    expect(sql).toContain('arcsial_blocks');
    expect(sql).toContain(`LIMIT ${Actors.SEARCH_LIMIT}`);
    expect(sql).not.toMatch(/email|username/i);
    expect(sql).toContain("ESCAPE '!'");
    expect(params).toEqual(['%50!%!_a!!b%', 3, 3]);
  });
});

describe('arcsialFollows.repository', () => {
  it('seguir, dejar de seguir y consultar', async () => {
    rows([], [], [{ 1: 1 }], []);
    await Follows.insertFollow(3, 7, conn);
    await Follows.deleteFollow(3, 7, conn);
    expect(await Follows.isFollowing(3, 7, conn)).toBe(true);
    expect(await Follows.isFollowing(3, 8, conn)).toBe(false);
    expect(call(0).sql).toContain(
      'INSERT INTO arcsial_follows (follower_user_id, target_actor_id)'
    );
    expect(call(0).sql).not.toContain('IGNORE');
    expect(call(1).sql).toContain('DELETE FROM arcsial_follows');
    expect(call(2).params).toEqual([3, 7]);
  });

  it('contadores de seguidores y seguidos', async () => {
    rows([{ total: 12 }], [{ total: '3' }]);
    expect(await Follows.countFollowers(7, conn)).toBe(12);
    expect(await Follows.countFollowing(5, conn)).toBe(3);
    expect(call(0).sql).toContain('WHERE target_actor_id = ?');
    expect(call(1).sql).toContain('WHERE follower_user_id = ?');
  });

  it('sin executor usa el pool', async () => {
    vi.mocked(db.execute).mockResolvedValue([[{ total: 0 }], []] as never);
    await Follows.insertFollow(3, 7);
    await Follows.deleteFollow(3, 7);
    expect(await Follows.isFollowing(3, 7)).toBe(true);
    expect(await Follows.countFollowers(7)).toBe(0);
    expect(await Follows.countFollowing(5)).toBe(0);
    expect(db.execute).toHaveBeenCalledTimes(5);
  });
});

describe('arcsialPosts.repository', () => {
  const POST_ROW = {
    id: 90,
    contentText: 'Hola',
    imageUrlsJson: '["https://cdn.example/a.png"]',
    visibility: 'PUBLIC',
    createdAt: '2026-10-10T12:00:00Z',
    handle: 'ana',
    displayName: 'Ana',
    avatarUrl: null,
    actorType: 'USER',
    canDelete: 1,
  };

  it('insertPost: imágenes como JSON, o NULL si no hay; devuelve el id', async () => {
    execute
      .mockResolvedValueOnce([{ insertId: 90 }, []])
      .mockResolvedValueOnce([{ insertId: 91 }, []]);
    const base = { authorActorId: 7, authorUserId: 5, contentText: 'Hola', visibility: 'PUBLIC' };
    const images = ['https://cdn.example/a.png'];
    expect(await Posts.insertPost({ ...base, imageUrls: images } as Posts.NewPost, conn)).toBe(90);
    expect(await Posts.insertPost({ ...base, imageUrls: [] } as Posts.NewPost, conn)).toBe(91);
    expect(call(0).params).toEqual([7, 5, 'Hola', JSON.stringify(images), 'PUBLIC']);
    expect(call(1).params[3]).toBeNull();
    expect(call(0).sql).toContain('INSERT INTO arcsial_posts');
    expect(call(0).sql).not.toContain('social_posts');
  });

  it('FC212 F1 — lockAuthorActor bloquea la fila del actor con FOR UPDATE', async () => {
    rows([{ id: 7 }]);
    await Posts.lockAuthorActor(7, conn);
    expect(call(0).sql).toBe('SELECT id FROM arcsial_actors WHERE id = ? FOR UPDATE');
    expect(call(0).params).toEqual([7]);
  });

  it('FC212 F1 — hasRecentTwin compara en binario actor, visibilidad, texto, imágenes y ventana', async () => {
    rows([{ 1: 1 }], []);
    const base = { authorActorId: 7, authorUserId: 5, contentText: 'Hola', visibility: 'CONTACTS' };
    const images = ['https://cdn.example/a.png'];
    expect(
      await Posts.hasRecentTwin({ ...base, imageUrls: images } as Posts.NewPost, 5, conn)
    ).toBe(true);
    expect(await Posts.hasRecentTwin({ ...base, imageUrls: [] } as Posts.NewPost, 5, conn)).toBe(
      false
    );
    expect(call(0).params).toEqual([7, 'CONTACTS', 'Hola', JSON.stringify(images), 5]);
    expect(call(1).params[3]).toBeNull();
    expect(call(0).sql).toContain('BINARY p.content_text = BINARY ?');
    expect(call(0).sql).toContain('BINARY p.image_urls_json <=> BINARY ?');
    expect(call(0).sql).toContain('p.created_at >= NOW() - INTERVAL ? SECOND');
  });

  it('findPostOwnership y deletePost', async () => {
    rows([{ authorUserId: 5, muUserId: null }], [], []);
    expect(await Posts.findPostOwnership(90, conn)).toEqual({ authorUserId: 5, muUserId: null });
    expect(await Posts.findPostOwnership(91, conn)).toBeNull();
    await Posts.deletePost(90, conn);
    expect(call(2).sql).toContain('DELETE FROM arcsial_posts WHERE id = ?');
    expect(call(2).params).toEqual([90]);
  });

  it('muro: por fecha descendente, cursor y visibilidades según el acceso', async () => {
    rows([POST_ROW, { ...POST_ROW, id: 89, imageUrlsJson: null, canDelete: 0 }], []);
    const viewer = { callerId: 3, actorId: 7, access: { followers: true, contacts: false } };
    const posts = await Posts.listWallPosts(viewer, { beforeId: 100, limit: 30 }, conn);
    expect(posts[0]).toEqual({
      id: 90,
      contentText: 'Hola',
      imageUrls: ['https://cdn.example/a.png'],
      visibility: 'PUBLIC',
      createdAt: '2026-10-10T12:00:00Z',
      author: { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' },
      canDelete: true,
    });
    expect(posts[1]).toMatchObject({ imageUrls: [], canDelete: false });
    expect(call(0).sql).toContain('ORDER BY p.created_at DESC, p.id DESC LIMIT ?');
    expect(call(0).params).toEqual([3, 3, 7, 100, 1, 0, 30]);
    const closed = { callerId: 3, actorId: 7, access: { followers: false, contacts: true } };
    await Posts.listWallPosts(closed, { limit: 10 }, conn);
    expect(call(1).params).toEqual([3, 3, 7, 2 ** 31, 0, 1, 10]);
  });

  it('feed: lo seguido (PUBLIC y FOLLOWERS) más lo propio, sin bloqueados', async () => {
    rows([POST_ROW], []);
    expect(await Posts.listFeedPosts(3, { beforeId: 50, limit: 30 }, conn)).toHaveLength(1);
    const { sql, params } = call();
    expect(sql).toContain("p.visibility IN ('PUBLIC', 'FOLLOWERS')");
    expect(sql).toContain('arcsial_follows');
    expect(sql).toContain('arcsial_blocks');
    expect(sql).toContain('ORDER BY p.created_at DESC, p.id DESC LIMIT ?');
    expect(params).toEqual([3, 3, 50, 3, 3, 3, 3, 30]);
    await Posts.listFeedPosts(3, { limit: 5 }, conn);
    expect(call(1).params[2]).toBe(2 ** 31);
  });

  it('sin executor usa el pool', async () => {
    vi.mocked(db.execute).mockResolvedValue([[], []] as never);
    const viewer = { callerId: 3, actorId: 7, access: { followers: false, contacts: false } };
    await Posts.insertPost({
      authorActorId: 7,
      authorUserId: 5,
      contentText: 'x',
      imageUrls: [],
      visibility: 'PUBLIC',
    });
    expect(await Posts.findPostOwnership(1)).toBeNull();
    await Posts.deletePost(1);
    expect(await Posts.listWallPosts(viewer, { limit: 1 })).toEqual([]);
    expect(await Posts.listFeedPosts(3, { limit: 1 })).toEqual([]);
    expect(db.execute).toHaveBeenCalledTimes(5);
  });
});
