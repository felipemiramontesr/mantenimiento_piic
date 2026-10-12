import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../api/client';
import { describeArcsialError } from './arcsialApi';
import {
  createPost,
  deletePost,
  describeElapsed,
  fetchActor,
  fetchFeed,
  fetchWall,
  followActor,
  isHttpsUrl,
  searchActors,
  unfollowActor,
  updateActorHandle,
  updateActorProfile,
} from './arcsialCoreApi';

/** FC210 F3 — cliente del núcleo social: cada llamada va a su ruta de la API de F2 (Adenda 1). */

vi.mock('../../api/client');

const PAGE = { success: true, posts: [{ id: 9 }], nextBeforeId: 8 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lecturas', () => {
  it('actor por handle', async () => {
    const actor = { id: 7, handle: 'ana', displayName: 'Ana' };
    vi.mocked(api.get).mockResolvedValue({ data: actor });
    expect(await fetchActor('ana')).toEqual(actor);
    expect(api.get).toHaveBeenCalledWith('/social/actors/ana');
  });

  it('muro y feed: primera página sin cursor y siguientes con beforeId', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: PAGE });
    const page = { posts: [{ id: 9 }], nextBeforeId: 8 };
    expect(await fetchWall('ana', null)).toEqual(page);
    expect(api.get).toHaveBeenLastCalledWith('/social/actors/ana/posts', { params: {} });
    await fetchWall('ana', 8);
    expect(api.get).toHaveBeenLastCalledWith('/social/actors/ana/posts', {
      params: { beforeId: 8 },
    });
    expect(await fetchFeed(null)).toEqual(page);
    expect(api.get).toHaveBeenLastCalledWith('/social/feed', { params: {} });
    await fetchFeed(50);
    expect(api.get).toHaveBeenLastCalledWith('/social/feed', { params: { beforeId: 50 } });
  });

  it('búsqueda por nombre', async () => {
    const card = { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' };
    vi.mocked(api.get).mockResolvedValue({ data: { actors: [card] } });
    expect(await searchActors('Ana')).toEqual([card]);
    expect(api.get).toHaveBeenCalledWith('/social/users/search', { params: { name: 'Ana' } });
  });
});

describe('escrituras', () => {
  it('publicar y borrar usan /social/actors/posts (Adenda 1), no la ruta legada', async () => {
    const post = { contentText: 'Hola', imageUrls: [], visibility: 'PUBLIC' as const };
    await createPost(post);
    await deletePost(90);
    expect(api.post).toHaveBeenCalledWith('/social/actors/posts', post);
    expect(api.delete).toHaveBeenCalledWith('/social/actors/posts/90');
  });

  it('seguir, dejar de seguir, perfil y handle', async () => {
    const patch = { displayName: 'Ana', bio: null, avatarUrl: null, isSearchable: true };
    await followActor('ana');
    await unfollowActor('ana');
    await updateActorProfile(patch);
    await updateActorHandle('ana_2');
    expect(api.post).toHaveBeenCalledWith('/social/actors/ana/follow');
    expect(api.delete).toHaveBeenCalledWith('/social/actors/ana/follow');
    expect(api.patch).toHaveBeenCalledWith('/social/actors/profile', patch);
    expect(api.patch).toHaveBeenCalledWith('/social/actors/handle', { handle: 'ana_2' });
  });
});

describe('utilidades', () => {
  it.each([
    ['https://cdn.example/a.png', true],
    ['http://cdn.example/a.png', false],
    ['https://', false],
    ['https://cdn.example/a b.png', false],
    ['cdn.example/a.png', false],
  ])('isHttpsUrl(%s) = %s', (url, expected) => {
    expect(isHttpsUrl(url)).toBe(expected);
  });

  const NOW = new Date('2026-10-12T12:00:00Z');
  it.each([
    ['2026-10-12T11:59:40Z', 'ahora'],
    ['2026-10-12T11:55:00Z', 'hace 5 min'],
    ['2026-10-12T09:00:00Z', 'hace 3 h'],
    ['2026-10-10T12:00:00Z', 'hace 2 d'],
    ['no-es-fecha', ''],
  ])('describeElapsed(%s) = %j', (createdAt, expected) => {
    expect(describeElapsed(createdAt, NOW)).toBe(expected);
  });

  it('describeElapsed: más de una semana ⇒ fecha corta; usa la hora actual por defecto', () => {
    expect(describeElapsed('2026-09-01T12:00:00Z', NOW)).toMatch(/2026/);
    expect(describeElapsed(new Date().toISOString())).toBe('ahora');
  });

  it.each([
    ['PII_DETECTED_IN_POST', 'datos sensibles'],
    ['INVALID_POST_CONTENT', '1 a 1000'],
    ['HANDLE_RESERVED', 'reservado'],
    ['INVALID_HANDLE_FORMAT', 'minúsculas'],
    ['QUERY_TOO_SHORT', 'al menos 3'],
    ['INVALID_SEARCH_QUERY', 'no por correo'],
    ['RATE_LIMIT_EXCEEDED', 'límite de búsquedas'],
    ['ACTOR_NOT_FOUND', 'No encontramos ese perfil'],
    ['ALREADY_FOLLOWING', 'Ya sigues'],
  ])('mensaje en español para %s', (code, text) => {
    expect(describeArcsialError({ response: { data: { code } } })).toContain(text);
  });
});
