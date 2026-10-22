import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import buildApp from '../index';
import {
  getActor,
  getOwnActorCard,
  searchActors,
  updateActorProfile,
} from '../services/arcsialActors.service';
import changeActorHandle from '../services/arcsialActorHandle.service';
import { followActor, unfollowActor } from '../services/arcsialFollows.service';
import { createPost, deletePost, listFeed, listWall } from '../services/arcsialPosts.service';

/**
 * FC210 F2 — cableado de `/v1/social/*` del núcleo social en la app real: sesión obligatoria, forma de
 * la entrada, orden de las puertas de búsqueda (T2: Q → N → R) y traducción del servicio a HTTP.
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));
vi.mock('../services/arcsialActors.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/arcsialActors.service')>()),
  getActor: vi.fn(),
  getOwnActorCard: vi.fn(),
  searchActors: vi.fn(),
  updateActorProfile: vi.fn(),
}));
vi.mock('../services/arcsialActorHandle.service', () => ({ default: vi.fn() }));
vi.mock('../services/arcsialFollows.service', () => ({
  followActor: vi.fn(),
  unfollowActor: vi.fn(),
}));
vi.mock('../services/arcsialPosts.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/arcsialPosts.service')>()),
  listWall: vi.fn(),
  listFeed: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
}));

const NOT_FOUND = { ok: false as const, status: 404, code: 'ACTOR_NOT_FOUND', message: 'x' };
const PAGE = { ok: true as const, posts: [], nextBeforeId: null };

type Injected = { statusCode: number; json: () => Record<string, unknown> };

describe('FC210 F2 — rutas del núcleo social de Arcsial', () => {
  const app = buildApp();
  let sign: (payload: object) => string;
  let auth: Record<string, string>;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (p: object) => string } };
    sign = (payload): string => jwt.sign(payload);
    auth = {
      authorization: `Bearer ${sign({ id: 3, username: 'arc', roleId: 2, permissions: [] })}`,
    };
  });

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  /** Atajo de inyección con la sesión de prueba. */
  async function call(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object
  ): Promise<Injected> {
    return app.inject({ method, url, headers: auth, payload });
  }

  it('T1 fila 11 / T2 fila 12 — sin sesión ⇒ 401 y ningún servicio se llama', async () => {
    const urls = ['/v1/social/actors/ana', '/v1/social/feed', '/v1/social/users/search?name=ana'];
    const codes = await Promise.all(
      urls.map(async (url) => (await app.inject({ method: 'GET', url })).statusCode)
    );
    expect(codes).toEqual([401, 401, 401]);
    expect(getActor).not.toHaveBeenCalled();
    expect(searchActors).not.toHaveBeenCalled();
  });

  it('GET actor: normaliza el handle, devuelve la vista y pasa el 404 del servicio', async () => {
    const view = { id: 7, actorType: 'USER', handle: 'ana', displayName: 'Ana', followersCount: 2 };
    vi.mocked(getActor).mockResolvedValueOnce({ ok: true, ...view } as never);
    const res = await call('GET', '/v1/social/actors/ANA');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, ...view });
    expect(getActor).toHaveBeenCalledWith(3, 'ana');
    vi.mocked(getActor).mockResolvedValueOnce(NOT_FOUND);
    const missing = await call('GET', '/v1/social/actors/nadie');
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ success: false, code: 'ACTOR_NOT_FOUND' });
  });

  it('FC212 F1 — GET /social/actors/me: tarjeta del actor propio, sin pasar por /:handle', async () => {
    const card = { handle: 'ana', displayName: 'Ana', avatarUrl: null };
    vi.mocked(getOwnActorCard).mockResolvedValueOnce({ ok: true, ...card });
    const res = await call('GET', '/v1/social/actors/me');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, ...card });
    expect(getOwnActorCard).toHaveBeenCalledWith(3);
    expect(getActor).not.toHaveBeenCalled();
    vi.mocked(getOwnActorCard).mockResolvedValueOnce(NOT_FOUND);
    expect((await call('GET', '/v1/social/actors/me')).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/v1/social/actors/me' })).statusCode).toBe(401);
  });

  it.each(['ab', 'a.b', 'ana%40piic.mx'])('handle de ruta inválido (%s) ⇒ 400', async (handle) => {
    expect((await call('GET', `/v1/social/actors/${handle}`)).statusCode).toBe(400);
    expect((await call('GET', `/v1/social/actors/${handle}/posts`)).statusCode).toBe(400);
    expect((await call('POST', `/v1/social/actors/${handle}/follow`)).statusCode).toBe(400);
    expect(getActor).not.toHaveBeenCalled();
    expect(listWall).not.toHaveBeenCalled();
    expect(followActor).not.toHaveBeenCalled();
  });

  it('seguir ⇒ 201; dejar de seguir ⇒ 200; el rechazo del servicio pasa tal cual', async () => {
    vi.mocked(followActor).mockResolvedValueOnce({ ok: true, following: true });
    const followed = await call('POST', '/v1/social/actors/ana/follow');
    expect(followed.statusCode).toBe(201);
    expect(followed.json()).toEqual({ success: true, following: true });
    vi.mocked(unfollowActor).mockResolvedValueOnce({ ok: true, following: false });
    expect((await call('DELETE', '/v1/social/actors/ana/follow')).statusCode).toBe(200);
    expect(unfollowActor).toHaveBeenCalledWith(3, 'ana');
    vi.mocked(followActor).mockResolvedValueOnce({
      ok: false,
      status: 409,
      code: 'ALREADY_FOLLOWING',
      message: 'x',
    });
    expect((await call('POST', '/v1/social/actors/ana/follow')).statusCode).toBe(409);
  });

  it('muro y feed: página de 30 por omisión, tope de 30 y cursor inválido ⇒ 400', async () => {
    vi.mocked(listWall).mockResolvedValue(PAGE);
    vi.mocked(listFeed).mockResolvedValue(PAGE);
    expect((await call('GET', '/v1/social/actors/ana/posts')).json()).toEqual({
      success: true,
      posts: [],
      nextBeforeId: null,
    });
    expect(listWall).toHaveBeenCalledWith(3, 'ana', { limit: 30 });
    await call('GET', '/v1/social/feed?beforeId=90&limit=10');
    expect(listFeed).toHaveBeenCalledWith(3, { beforeId: 90, limit: 10 });
    expect((await call('GET', '/v1/social/actors/ana/posts?limit=31')).statusCode).toBe(400);
    expect((await call('GET', '/v1/social/feed?beforeId=0')).statusCode).toBe(400);
    expect(listWall).toHaveBeenCalledTimes(1);
    expect(listFeed).toHaveBeenCalledTimes(1);
  });

  it('Adenda 1 — POST /social/actors/posts: 201 con el autor; el rechazo del servicio pasa tal cual', async () => {
    vi.mocked(createPost).mockResolvedValueOnce({ ok: true, id: 90, author: 'USER' });
    const body = { contentText: 'Hola', imageUrls: ['https://cdn.example/a.png'] };
    const res = await call('POST', '/v1/social/actors/posts', body);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true, id: 90, author: 'USER' });
    expect(createPost).toHaveBeenLastCalledWith(3, body);
    vi.mocked(createPost).mockResolvedValueOnce({
      ok: false,
      status: 400,
      code: 'PII_DETECTED_IN_POST',
      message: 'x',
    });
    const universe = { contentText: 'ABC-1234', visibility: 'FOLLOWERS', asUniverseTenantId: 41 };
    const rejected = await call('POST', '/v1/social/actors/posts', universe);
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json()).toMatchObject({ success: false, code: 'PII_DETECTED_IN_POST' });
    expect(createPost).toHaveBeenLastCalledWith(3, universe);
  });

  it.each([
    ['sin texto', {}],
    ['texto que no es cadena', { contentText: 5 }],
    ['imágenes que no son lista', { contentText: 'x', imageUrls: 'https://cdn.example/a.png' }],
    ['visibilidad desconocida', { contentText: 'x', visibility: 'SECRET' }],
    ['Universo no numérico', { contentText: 'x', asUniverseTenantId: '41' }],
  ])(
    'Adenda 1 — POST con forma inválida (%s) ⇒ 400 sin llamar al servicio',
    async (_case, body) => {
      const res = await call('POST', '/v1/social/actors/posts', body);
      expect(res.json()).toEqual({ success: false, code: 'VALIDATION_ERROR' });
      expect(createPost).not.toHaveBeenCalled();
    }
  );

  it('Adenda 1 — DELETE /social/actors/posts/:id: valida el id y delega', async () => {
    expect((await call('DELETE', '/v1/social/actors/posts/abc')).statusCode).toBe(400);
    expect((await call('DELETE', '/v1/social/actors/posts/0')).statusCode).toBe(400);
    expect(deletePost).not.toHaveBeenCalled();
    vi.mocked(deletePost).mockResolvedValueOnce({ ok: true });
    const res = await call('DELETE', '/v1/social/actors/posts/90');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    expect(deletePost).toHaveBeenCalledWith(3, 90);
  });

  it('Adenda 1 — las rutas legadas /social/posts siguen en routes/social.ts, no en el núcleo nuevo', async () => {
    await call('POST', '/v1/social/posts', { contentText: 'Hola' });
    await call('DELETE', '/v1/social/posts/1');
    expect(createPost).not.toHaveBeenCalled();
    expect(deletePost).not.toHaveBeenCalled();
  });

  it('T2 filas 3 y 4 — búsqueda: con arroba ⇒ INVALID_SEARCH_QUERY; corta ⇒ QUERY_TOO_SHORT', async () => {
    const withAt = await call('GET', '/v1/social/users/search?name=ana%40piic.mx');
    expect(withAt.statusCode).toBe(400);
    expect(withAt.json()).toEqual({ success: false, code: 'INVALID_SEARCH_QUERY' });
    // La arroba manda sobre la longitud (fila 4: N indiferente).
    expect((await call('GET', '/v1/social/users/search?name=%40')).json()).toMatchObject({
      code: 'INVALID_SEARCH_QUERY',
    });
    const short = await call('GET', '/v1/social/users/search?name=%20an%20');
    expect(short.json()).toEqual({ success: false, code: 'QUERY_TOO_SHORT' });
    const long = await call('GET', `/v1/social/users/search?name=${'a'.repeat(51)}`);
    expect(long.json()).toEqual({ success: false, code: 'VALIDATION_ERROR' });
    expect((await call('GET', '/v1/social/users/search')).statusCode).toBe(400);
    expect(searchActors).not.toHaveBeenCalled();
  });

  it('T2 fila 1 — búsqueda válida: nombre recortado y tarjetas públicas', async () => {
    const card = { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' as const };
    vi.mocked(searchActors).mockResolvedValue({ ok: true, actors: [card] });
    const res = await call('GET', '/v1/social/users/search?name=%20Ana%20');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, actors: [card] });
    expect(searchActors).toHaveBeenCalledWith(3, 'Ana');
  });

  it('T2 fila 2 — 20 búsquedas por hora y por sesión; las inválidas no gastan cuota', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(searchActors).mockResolvedValue({ ok: true, actors: [] });
    const other = { authorization: `Bearer ${sign({ id: 77, username: 'b', permissions: [] })}` };
    const search = (headers: Record<string, string>, name = 'ana'): Promise<Injected> =>
      app.inject({ method: 'GET', url: `/v1/social/users/search?name=${name}`, headers });
    const codes = await Array.from({ length: 20 }).reduce<Promise<number[]>>(
      async (previous) => [...(await previous), (await search(other)).statusCode],
      Promise.resolve([])
    );
    expect(codes).toEqual(Array(20).fill(200));
    expect((await search(other, 'a%40b')).statusCode).toBe(400);
    const exceeded = await search(other);
    expect(exceeded.statusCode).toBe(429);
    expect(exceeded.json()).toEqual({ success: false, code: 'RATE_LIMIT_EXCEEDED' });
    expect(searchActors).toHaveBeenCalledTimes(20);
    // Otra sesión conserva su propia cuota.
    expect((await search(auth)).statusCode).toBe(200);
  });

  it.each(['/v1/social/actors/handle', '/v1/social/profile/handle'])(
    'PATCH %s — T2 filas 10 y 11: formato inválido o arroba ⇒ INVALID_HANDLE_FORMAT',
    async (url) => {
      const bodies = [{ handle: 'a@b' }, { handle: 'ab' }, { handle: 'a-b' }, {}];
      const codes = await Promise.all(
        bodies.map(async (body) => (await call('PATCH', url, body)).json().code)
      );
      expect(codes).toEqual(Array(4).fill('INVALID_HANDLE_FORMAT'));
      const badTenant = await call('PATCH', url, { handle: 'ana', asUniverseTenantId: -1 });
      expect(badTenant.json()).toEqual({ success: false, code: 'VALIDATION_ERROR' });
      expect(changeActorHandle).not.toHaveBeenCalled();
    }
  );

  it('PATCH handle: delega con el handle en minúsculas y el Universo opcional', async () => {
    vi.mocked(changeActorHandle).mockResolvedValue({ ok: true, handle: 'ana_2' });
    const personal = await call('PATCH', '/v1/social/profile/handle', { handle: 'Ana_2' });
    expect(personal.json()).toEqual({ success: true, handle: 'ana_2' });
    expect(changeActorHandle).toHaveBeenLastCalledWith(3, 'ana_2', undefined);
    await call('PATCH', '/v1/social/actors/handle', { handle: 'flota', asUniverseTenantId: 41 });
    expect(changeActorHandle).toHaveBeenLastCalledWith(3, 'flota', 41);
  });

  it.each([
    ['cuerpo vacío', {}],
    ['solo el Universo', { asUniverseTenantId: 41 }],
    ['nombre vacío', { displayName: '   ' }],
    ['bio de más de 500', { bio: 'x'.repeat(501) }],
    ['avatar http', { avatarUrl: 'http://cdn.example/a.png' }],
    ['avatar que no es URL', { avatarUrl: 'https://' }],
    ['isSearchable no booleano', { isSearchable: 'no' }],
    ['id de actor en el cuerpo', { bio: 'x', actorId: 9 }],
  ])('PATCH perfil: %s ⇒ 400 sin llamar al servicio', async (_case, body) => {
    expect((await call('PATCH', '/v1/social/actors/profile', body)).statusCode).toBe(400);
    expect(updateActorProfile).not.toHaveBeenCalled();
  });

  it('PATCH perfil: delega el parche sin el Universo y acepta null para borrar', async () => {
    const own = {
      ok: true as const,
      handle: 'ana',
      displayName: 'Ana P',
      bio: null,
      avatarUrl: null,
      isSearchable: false,
    };
    vi.mocked(updateActorProfile).mockResolvedValue(own);
    const body = { displayName: ' Ana P ', bio: null, avatarUrl: null, isSearchable: false };
    const res = await call('PATCH', '/v1/social/actors/profile', body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, displayName: 'Ana P', isSearchable: false });
    expect(updateActorProfile).toHaveBeenLastCalledWith(
      3,
      { displayName: 'Ana P', bio: null, avatarUrl: null, isSearchable: false },
      undefined
    );
    await call('PATCH', '/v1/social/actors/profile', {
      avatarUrl: 'https://cdn.example/a.png',
      asUniverseTenantId: 41,
    });
    expect(updateActorProfile).toHaveBeenLastCalledWith(
      3,
      { avatarUrl: 'https://cdn.example/a.png' },
      41
    );
  });
});
