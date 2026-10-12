import * as PostsRepository from './arcsialPosts.repository';
import { isFollowing } from './arcsialFollows.repository';
import { areContacts } from './arcsialRelations.repository';
import { containsPII } from '../routes/social';
import {
  ACTOR_NOT_FOUND,
  NOT_UNIVERSE_MASTER,
  findVisibleActor,
  isActorOwner,
  resolveActingActor,
} from './arcsialActors.service';
import type { ArcsialError } from './arcsialProfiles.service';
import type { ActorType, ArcsialActor } from './arcsialActors.repository';
import type {
  ArcsialPost,
  PostCursor,
  PostVisibility,
  WallAccess,
} from './arcsialPosts.repository';

/**
 * FC210 F2 (T1) — publicaciones de Arcsial V2 sobre `arcsial_posts`. Emisión en el orden de la tabla:
 * U ∧ ¬M (a nombre de un Universo sin ser su MU, 403) → ¬P (placas o VIN, 400) → ¬L (texto de 1 a 1000,
 * hasta 4 imágenes https, 400). Las URL se guardan como metadatos: el API nunca las descarga.
 */

export const POST_TEXT_MAX = 1000;
export const POST_IMAGES_MAX = 4;
const IMAGE_URL_MAX = 2048;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const PII_DETECTED: ArcsialError = {
  ok: false,
  status: 400,
  code: 'PII_DETECTED_IN_POST',
  message: 'La publicación contiene placas o un número de serie',
};

const INVALID_POST_CONTENT: ArcsialError = {
  ok: false,
  status: 400,
  code: 'INVALID_POST_CONTENT',
  message: 'El texto debe tener de 1 a 1000 caracteres y hasta 4 imágenes https',
};

const POST_NOT_FOUND: ArcsialError = {
  ok: false,
  status: 404,
  code: 'POST_NOT_FOUND',
  message: 'No se encontró la publicación',
};

const FORBIDDEN_POST_DELETE: ArcsialError = {
  ok: false,
  status: 403,
  code: 'FORBIDDEN_POST_DELETE',
  message: 'Solo quien la redactó o el Master of Universe puede borrarla',
};

export interface PostInput {
  readonly contentText: string;
  readonly imageUrls?: string[];
  readonly visibility?: PostVisibility;
  readonly asUniverseTenantId?: number;
}

/** ¿El texto se puede leer como URL? */
function isParsableUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** ¿Es una URL https bien formada, sin espacios, que termina en una extensión de imagen admitida? */
function isAllowedImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const shapeOk = url.length <= IMAGE_URL_MAX && !/\s/.test(url) && lower.startsWith('https://');
  return shapeOk && IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) && isParsableUrl(url);
}

/** L: texto de 1 a 1000 caracteres y, como mucho, 4 imágenes https. */
function isValidContent(text: string, imageUrls: string[]): boolean {
  const lengthOk = text.length >= 1 && text.length <= POST_TEXT_MAX;
  return lengthOk && imageUrls.length <= POST_IMAGES_MAX && imageUrls.every(isAllowedImageUrl);
}

/** POST de publicación — en el muro propio, o en el del Universo si la sesión es su MU. */
export async function createPost(
  userId: number,
  input: PostInput
): Promise<{ ok: true; id: number; author: ActorType } | ArcsialError> {
  const actor = await resolveActingActor(userId, input.asUniverseTenantId);
  if (!actor) return input.asUniverseTenantId === undefined ? ACTOR_NOT_FOUND : NOT_UNIVERSE_MASTER;
  const contentText = input.contentText.trim();
  const imageUrls = input.imageUrls ?? [];
  if (containsPII(contentText)) return PII_DETECTED;
  if (!isValidContent(contentText, imageUrls)) return INVALID_POST_CONTENT;
  const id = await PostsRepository.insertPost({
    authorActorId: actor.id,
    authorUserId: userId,
    contentText,
    imageUrls,
    visibility: input.visibility ?? 'PUBLIC',
  });
  return { ok: true, id, author: actor.actorType };
}

/** DELETE de publicación — quien la redactó, o el MU del Universo que la firma. */
export async function deletePost(
  userId: number,
  postId: number
): Promise<{ ok: true } | ArcsialError> {
  const ownership = await PostsRepository.findPostOwnership(postId);
  if (!ownership) return POST_NOT_FOUND;
  if (ownership.authorUserId !== userId && ownership.muUserId !== userId) {
    return FORBIDDEN_POST_DELETE;
  }
  await PostsRepository.deletePost(postId);
  return { ok: true };
}

export interface PostPage {
  readonly posts: ArcsialPost[];
  /** Cursor de la página siguiente, o null si ya no hay más. */
  readonly nextBeforeId: number | null;
}

/** Empaqueta una página: si vino llena, la siguiente empieza bajo su última publicación. */
function toPage(posts: ArcsialPost[], limit: number): PostPage {
  return { posts, nextBeforeId: posts.length === limit ? posts[posts.length - 1].id : null };
}

/** Qué ve quien consulta: el dueño ve cada visibilidad; el resto, según siga al actor o sea su contacto. */
async function wallAccess(callerId: number, actor: ArcsialActor): Promise<WallAccess> {
  if (isActorOwner(actor, callerId)) return { followers: true, contacts: true };
  const [followers, contacts] = await Promise.all([
    isFollowing(callerId, actor.id),
    actor.userId === null ? false : areContacts(callerId, actor.userId),
  ]);
  return { followers, contacts };
}

/** GET /v1/social/actors/:handle/posts — inexistente o bloqueado ⇒ 404 opaco. */
export async function listWall(
  callerId: number,
  handle: string,
  cursor: PostCursor
): Promise<({ ok: true } & PostPage) | ArcsialError> {
  const actor = await findVisibleActor(callerId, handle);
  if (!actor) return ACTOR_NOT_FOUND;
  const access = await wallAccess(callerId, actor);
  const posts = await PostsRepository.listWallPosts(
    { callerId, actorId: actor.id, access },
    cursor
  );
  return { ok: true, ...toPage(posts, cursor.limit) };
}

/** GET /v1/social/feed — lo de los actores seguidos más lo propio, por fecha descendente. */
export async function listFeed(
  callerId: number,
  cursor: PostCursor
): Promise<{ ok: true } & PostPage> {
  const posts = await PostsRepository.listFeedPosts(callerId, cursor);
  return { ok: true, ...toPage(posts, cursor.limit) };
}
