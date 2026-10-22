import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Actors from './arcsialActors.repository';
import * as Posts from './arcsialPosts.repository';
import db from './db';
import { isFollowing } from './arcsialFollows.repository';
import { areContacts, isBlockedEitherWay } from './arcsialRelations.repository';
import {
  createPost,
  deletePost,
  listFeed,
  listWall,
  POST_IMAGES_MAX,
  POST_TEXT_MAX,
} from './arcsialPosts.service';
import type { ArcsialActor } from './arcsialActors.repository';
import type { ArcsialPost } from './arcsialPosts.repository';

/**
 * FC210 F2 (T1, filas 1–5) — emisión de publicaciones en el orden U ∧ ¬M → ¬P → ¬L, borrado por quien
 * la redactó o por el MU, y visibilidades del muro según quien consulta.
 */

vi.mock('./db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() } }));
vi.mock('./arcsialActors.repository', () => ({
  findActorByHandle: vi.fn(),
  findActorByUserId: vi.fn(),
  findActorByTenantId: vi.fn(),
}));
vi.mock('./arcsialPosts.repository', () => ({
  insertPost: vi.fn(),
  lockAuthorActor: vi.fn(),
  hasRecentTwin: vi.fn(),
  findPostOwnership: vi.fn(),
  deletePost: vi.fn(),
  listWallPosts: vi.fn(),
  listFeedPosts: vi.fn(),
}));
vi.mock('./arcsialFollows.repository', () => ({ isFollowing: vi.fn() }));
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
const IMAGE = 'https://cdn.example/foto.png';

/** Conexión simulada de la transacción que bloquea al actor autor (FC212 F1). */
const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

/** Publicaciones de relleno con ids descendentes desde `first`. */
function posts(count: number, first = 100): ArcsialPost[] {
  return Array.from({ length: count }, (_, i) => ({ id: first - i } as ArcsialPost));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(Actors.findActorByUserId).mockResolvedValue(USER_ACTOR);
  vi.mocked(Actors.findActorByTenantId).mockResolvedValue(UNIVERSE_ACTOR);
  vi.mocked(Actors.findActorByHandle).mockResolvedValue(USER_ACTOR);
  vi.mocked(Posts.insertPost).mockResolvedValue(90);
  vi.mocked(Posts.hasRecentTwin).mockResolvedValue(false);
  vi.mocked(db.getConnection).mockResolvedValue(connection as never);
  vi.mocked(Posts.listWallPosts).mockResolvedValue([]);
  vi.mocked(Posts.listFeedPosts).mockResolvedValue([]);
  vi.mocked(isFollowing).mockResolvedValue(false);
  vi.mocked(areContacts).mockResolvedValue(false);
  vi.mocked(isBlockedEitherWay).mockResolvedValue(false);
});

describe('createPost', () => {
  it('fila 1 — muro personal: texto recortado, PUBLIC por omisión, sin imágenes', async () => {
    expect(await createPost(5, { contentText: '  Hola  ' })).toEqual({
      ok: true,
      id: 90,
      author: 'USER',
    });
    expect(Posts.insertPost).toHaveBeenCalledWith(
      {
        authorActorId: 7,
        authorUserId: 5,
        contentText: 'Hola',
        imageUrls: [],
        visibility: 'PUBLIC',
      },
      connection
    );
  });

  it('fila 2 — a nombre del Universo por su MU: firma el actor UNIVERSE, redacta la persona', async () => {
    const input = {
      contentText: 'Aviso',
      imageUrls: [IMAGE],
      visibility: 'FOLLOWERS' as const,
      asUniverseTenantId: 41,
    };
    expect(await createPost(3, input)).toEqual({ ok: true, id: 90, author: 'UNIVERSE' });
    expect(Posts.insertPost).toHaveBeenCalledWith(
      {
        authorActorId: 8,
        authorUserId: 3,
        contentText: 'Aviso',
        imageUrls: [IMAGE],
        visibility: 'FOLLOWERS',
      },
      connection
    );
  });

  it('fila 3 — a nombre de un Universo sin ser su MU ⇒ 403, antes que PII o longitud', async () => {
    const result = await createPost(5, { contentText: 'ABC-1234', asUniverseTenantId: 41 });
    expect(result).toMatchObject({ status: 403, code: 'FORBIDDEN_NOT_UNIVERSE_MASTER' });
    expect(Posts.insertPost).not.toHaveBeenCalled();
  });

  it('persona sin actor ⇒ 404', async () => {
    vi.mocked(Actors.findActorByUserId).mockResolvedValue(null);
    expect(await createPost(5, { contentText: 'Hola' })).toMatchObject({
      status: 404,
      code: 'ACTOR_NOT_FOUND',
    });
  });

  it.each(['Vendo la ABC-1234', 'Serie 1HGCM82633A004352', `ABC-1234 ${'x'.repeat(2000)}`])(
    'fila 4 — placas o VIN ⇒ 400 PII_DETECTED_IN_POST, aunque el largo también falle (%#)',
    async (contentText) => {
      expect(await createPost(5, { contentText })).toMatchObject({
        status: 400,
        code: 'PII_DETECTED_IN_POST',
      });
      expect(Posts.insertPost).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['texto vacío', { contentText: '   ' }],
    ['texto de más de 1000', { contentText: 'x'.repeat(POST_TEXT_MAX + 1) }],
    ['más de 4 imágenes', { contentText: 'ok', imageUrls: Array(POST_IMAGES_MAX + 1).fill(IMAGE) }],
    ['imagen http', { contentText: 'ok', imageUrls: ['http://cdn.example/a.png'] }],
    ['extensión no admitida', { contentText: 'ok', imageUrls: ['https://cdn.example/a.gif'] }],
    ['URL con espacios', { contentText: 'ok', imageUrls: ['https://cdn.example/a b.png'] }],
    ['URL que no se puede leer', { contentText: 'ok', imageUrls: ['https://[mal.png'] }],
    [
      'URL demasiado larga',
      { contentText: 'ok', imageUrls: [`https://a.mx/${'x'.repeat(2048)}.png`] },
    ],
  ])('fila 5 — %s ⇒ 400 INVALID_POST_CONTENT', async (_case, input) => {
    expect(await createPost(5, input)).toMatchObject({
      status: 400,
      code: 'INVALID_POST_CONTENT',
    });
    expect(Posts.insertPost).not.toHaveBeenCalled();
  });

  it('acepta el límite exacto: 1000 caracteres y 4 imágenes de las extensiones admitidas', async () => {
    const imageUrls = ['a.jpg', 'b.JPEG', 'c.png', 'd.webp'].map((f) => `https://cdn.example/${f}`);
    const result = await createPost(5, { contentText: 'x'.repeat(POST_TEXT_MAX), imageUrls });
    expect(result).toMatchObject({ ok: true });
  });
});

describe('FC212 F1 (T2) — publicación gemela del mismo actor en 5 s', () => {
  it('bloquea al actor autor, busca la gemela en la misma transacción y, sin gemela, inserta', async () => {
    await createPost(5, { contentText: 'Hola', visibility: 'CONTACTS' });
    const post = {
      authorActorId: 7,
      authorUserId: 5,
      contentText: 'Hola',
      imageUrls: [],
      visibility: 'CONTACTS',
    };
    expect(Posts.lockAuthorActor).toHaveBeenCalledWith(7, connection);
    expect(Posts.hasRecentTwin).toHaveBeenCalledWith(post, 5, connection);
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('con gemela reciente ⇒ 409 DUPLICATE_POST y no inserta', async () => {
    vi.mocked(Posts.hasRecentTwin).mockResolvedValue(true);
    expect(await createPost(5, { contentText: 'Hola' })).toEqual({
      ok: false,
      status: 409,
      code: 'DUPLICATE_POST',
      message: 'Ya has enviado esta publicación recientemente',
    });
    expect(Posts.insertPost).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
  });

  it('si la inserción falla, la transacción se revierte y el error sube', async () => {
    vi.mocked(Posts.insertPost).mockRejectedValue(new Error('db caída'));
    await expect(createPost(5, { contentText: 'Hola' })).rejects.toThrow('db caída');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it('el rechazo por contenido sigue antes del candado: no abre transacción', async () => {
    expect(await createPost(5, { contentText: '' })).toMatchObject({
      code: 'INVALID_POST_CONTENT',
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});

describe('deletePost', () => {
  it('inexistente ⇒ 404; ajena ⇒ 403, sin borrar', async () => {
    vi.mocked(Posts.findPostOwnership).mockResolvedValueOnce(null);
    expect(await deletePost(5, 90)).toMatchObject({ status: 404, code: 'POST_NOT_FOUND' });
    vi.mocked(Posts.findPostOwnership).mockResolvedValueOnce({ authorUserId: 9, muUserId: null });
    expect(await deletePost(5, 90)).toMatchObject({ status: 403, code: 'FORBIDDEN_POST_DELETE' });
    expect(Posts.deletePost).not.toHaveBeenCalled();
  });

  it('la borra quien la redactó, o el MU del Universo que la firma', async () => {
    vi.mocked(Posts.findPostOwnership).mockResolvedValue({ authorUserId: 9, muUserId: 3 });
    expect(await deletePost(9, 90)).toEqual({ ok: true });
    expect(await deletePost(3, 90)).toEqual({ ok: true });
    expect(Posts.deletePost).toHaveBeenCalledTimes(2);
  });
});

describe('listWall', () => {
  const cursor = { limit: 2 };

  it('actor inexistente o bloqueado ⇒ 404 opaco, sin leer publicaciones', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValueOnce(null);
    const missing = await listWall(3, 'nadie', cursor);
    vi.mocked(isBlockedEitherWay).mockResolvedValueOnce(true);
    const blocked = await listWall(3, 'ana', cursor);
    expect(missing).toMatchObject({ status: 404, code: 'ACTOR_NOT_FOUND' });
    expect(blocked).toEqual(missing);
    expect(Posts.listWallPosts).not.toHaveBeenCalled();
  });

  it('visitante: FOLLOWERS solo si lo sigue y CONTACTS solo si es su contacto', async () => {
    vi.mocked(isFollowing).mockResolvedValue(true);
    await listWall(3, 'ana', cursor);
    expect(Posts.listWallPosts).toHaveBeenLastCalledWith(
      { callerId: 3, actorId: 7, access: { followers: true, contacts: false } },
      cursor
    );
    vi.mocked(isFollowing).mockResolvedValue(false);
    vi.mocked(areContacts).mockResolvedValue(true);
    await listWall(3, 'ana', cursor);
    expect(Posts.listWallPosts).toHaveBeenLastCalledWith(
      { callerId: 3, actorId: 7, access: { followers: false, contacts: true } },
      cursor
    );
  });

  it('el dueño ve cada visibilidad sin consultar relaciones', async () => {
    await listWall(5, 'ana', cursor);
    expect(Posts.listWallPosts).toHaveBeenCalledWith(
      { callerId: 5, actorId: 7, access: { followers: true, contacts: true } },
      cursor
    );
    expect(isFollowing).not.toHaveBeenCalled();
  });

  it('muro de un Universo: nadie es su contacto; su MU ve cada visibilidad', async () => {
    vi.mocked(Actors.findActorByHandle).mockResolvedValue(UNIVERSE_ACTOR);
    await listWall(5, 'fms_41', cursor);
    expect(Posts.listWallPosts).toHaveBeenLastCalledWith(
      { callerId: 5, actorId: 8, access: { followers: false, contacts: false } },
      cursor
    );
    expect(areContacts).not.toHaveBeenCalled();
    await listWall(3, 'fms_41', cursor);
    expect(Posts.listWallPosts).toHaveBeenLastCalledWith(
      { callerId: 3, actorId: 8, access: { followers: true, contacts: true } },
      cursor
    );
  });

  it('página llena ⇒ cursor de la siguiente; página corta ⇒ null', async () => {
    vi.mocked(Posts.listWallPosts).mockResolvedValueOnce(posts(2));
    expect(await listWall(3, 'ana', cursor)).toMatchObject({ ok: true, nextBeforeId: 99 });
    vi.mocked(Posts.listWallPosts).mockResolvedValueOnce(posts(1));
    expect(await listWall(3, 'ana', cursor)).toMatchObject({ nextBeforeId: null });
  });
});

describe('listFeed', () => {
  it('pide el feed de la sesión con el cursor y empaqueta la página', async () => {
    vi.mocked(Posts.listFeedPosts).mockResolvedValueOnce(posts(3, 50));
    const cursor = { beforeId: 60, limit: 3 };
    expect(await listFeed(3, cursor)).toEqual({ ok: true, posts: posts(3, 50), nextBeforeId: 48 });
    expect(Posts.listFeedPosts).toHaveBeenCalledWith(3, cursor);
    expect(await listFeed(3, cursor)).toEqual({ ok: true, posts: [], nextBeforeId: null });
  });
});
