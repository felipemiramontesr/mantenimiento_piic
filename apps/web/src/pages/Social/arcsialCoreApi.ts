import api from '../../api/client';

/**
 * FC210 F3 — cliente web del núcleo social de Arcsial V2 (`/v1/social/*`, solo con sesión): actores
 * (personas y universos), seguimiento, publicaciones, muro, feed, búsqueda por nombre y edición del
 * perfil. La emisión y el borrado van a `/social/actors/posts` (Adenda 1).
 */

export type ActorType = 'USER' | 'UNIVERSE';
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'CONTACTS';

export const POST_TEXT_MAX = 1000;
export const POST_IMAGES_MAX = 4;
export const SEARCH_NAME_MIN = 3;
export const BIO_MAX = 500;

export interface ActorCard {
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly actorType: ActorType;
}

export interface ActorView extends ActorCard {
  readonly id: number;
  readonly bio: string | null;
  readonly followersCount: number;
  readonly followingCount: number;
  readonly isFollowedByMe: boolean;
  readonly isContact: boolean;
  /** Solo viaja cuando la sesión es dueña del actor. */
  readonly isSearchable?: boolean;
}

export interface ArcsialPost {
  readonly id: number;
  readonly contentText: string;
  readonly imageUrls: string[];
  readonly visibility: PostVisibility;
  readonly createdAt: string;
  readonly author: ActorCard;
  readonly canDelete: boolean;
}

export interface PostPage {
  readonly posts: ArcsialPost[];
  readonly nextBeforeId: number | null;
}

export interface NewPost {
  readonly contentText: string;
  readonly imageUrls: string[];
  readonly visibility: PostVisibility;
  /** Publicar a nombre del Universo del que la sesión es MU. */
  readonly asUniverseTenantId?: number;
}

export interface ActorProfilePatch {
  readonly displayName: string;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly isSearchable: boolean;
}

/** Parámetros del cursor: sin `beforeId` se pide la primera página. */
function cursorParams(beforeId: number | null): { beforeId?: number } {
  return beforeId === null ? {} : { beforeId };
}

/** Perfil público de un actor (404 si no existe o hay bloqueo). */
export async function fetchActor(handle: string): Promise<ActorView> {
  const { data } = await api.get<ActorView>(`/social/actors/${handle}`);
  return data;
}

/** Una página del muro de un actor. */
export async function fetchWall(handle: string, beforeId: number | null): Promise<PostPage> {
  const { data } = await api.get<PostPage>(`/social/actors/${handle}/posts`, {
    params: cursorParams(beforeId),
  });
  return { posts: data.posts, nextBeforeId: data.nextBeforeId };
}

/** Una página del feed de la sesión. */
export async function fetchFeed(beforeId: number | null): Promise<PostPage> {
  const { data } = await api.get<PostPage>('/social/feed', { params: cursorParams(beforeId) });
  return { posts: data.posts, nextBeforeId: data.nextBeforeId };
}

/** Publica en el muro propio o, si la sesión es su MU, en el del Universo. */
export async function createPost(post: NewPost): Promise<void> {
  await api.post('/social/actors/posts', post);
}

/** Borra una publicación propia (o del Universo, su MU). */
export async function deletePost(id: number): Promise<void> {
  await api.delete(`/social/actors/posts/${id}`);
}

/** Sigue a un actor. */
export async function followActor(handle: string): Promise<void> {
  await api.post(`/social/actors/${handle}/follow`);
}

/** Deja de seguir a un actor. */
export async function unfollowActor(handle: string): Promise<void> {
  await api.delete(`/social/actors/${handle}/follow`);
}

/** Busca actores por nombre visible (máximo 10; 20 búsquedas por hora). */
export async function searchActors(name: string): Promise<ActorCard[]> {
  const { data } = await api.get<{ actors: ActorCard[] }>('/social/users/search', {
    params: { name },
  });
  return data.actors;
}

/** Edita la presentación pública del actor de la sesión. */
export async function updateActorProfile(patch: ActorProfilePatch): Promise<void> {
  await api.patch('/social/actors/profile', patch);
}

/** Cambia el @handle del actor de la sesión (único entre personas y universos). */
export async function updateActorHandle(handle: string): Promise<void> {
  await api.patch('/social/actors/handle', { handle });
}

/** ¿Es una URL https sin espacios? (misma regla del servidor; la extensión la valida él). */
export function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://') && url.length > 'https://'.length && !/\s/.test(url);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** «ahora», «hace 5 min», «hace 3 h», «hace 2 d» o la fecha corta si pasó más de una semana. */
export function describeElapsed(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  const ms = now.getTime() - created.getTime();
  if (Number.isNaN(ms)) return '';
  if (ms < MINUTE) return 'ahora';
  if (ms < HOUR) return `hace ${Math.floor(ms / MINUTE)} min`;
  if (ms < DAY) return `hace ${Math.floor(ms / HOUR)} h`;
  if (ms < 7 * DAY) return `hace ${Math.floor(ms / DAY)} d`;
  return created.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
