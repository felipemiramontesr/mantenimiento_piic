import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';
import type { ActorType } from './arcsialActors.repository';

/**
 * FC210 F2 — SQL de `arcsial_posts` (migración 186): muro por actor y feed, siempre por `created_at`
 * descendente y paginados por cursor (`id < beforeId`). `social_posts` no se lee ni se escribe aquí.
 */
type Executor = Pool | PoolConnection;

export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'CONTACTS';

export interface ArcsialPost {
  readonly id: number;
  readonly contentText: string;
  readonly imageUrls: string[];
  readonly visibility: PostVisibility;
  readonly createdAt: string;
  readonly author: {
    readonly handle: string;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly actorType: ActorType;
  };
  /** Quien consulta puede borrarla: la redactó, o es el MU del Universo que la firma. */
  readonly canDelete: boolean;
}

export interface NewPost {
  readonly authorActorId: number;
  readonly authorUserId: number;
  readonly contentText: string;
  readonly imageUrls: string[];
  readonly visibility: PostVisibility;
}

export interface PostCursor {
  /** Solo publicaciones con id menor; sin cursor, desde la más reciente. */
  readonly beforeId?: number;
  readonly limit: number;
}

/** Qué visibilidades del muro puede ver quien consulta, además de PUBLIC. */
export interface WallAccess {
  readonly followers: boolean;
  readonly contacts: boolean;
}

export interface PostOwnership {
  readonly authorUserId: number;
  readonly muUserId: number | null;
}

/** Por encima de cualquier `id` INT(11): equivale a «sin cursor». */
const NO_CURSOR = 2 ** 31;

const POST_SELECT = `SELECT p.id, p.content_text AS contentText, p.image_urls_json AS imageUrlsJson,
       p.visibility, p.created_at AS createdAt, a.handle, a.display_name AS displayName,
       a.avatar_url AS avatarUrl, a.actor_type AS actorType,
       COALESCE(p.author_user_id = ? OR t.mu_user_id = ?, 0) AS canDelete
     FROM arcsial_posts p
     JOIN arcsial_actors a ON a.id = p.author_actor_id
     LEFT JOIN tenants t ON t.id = a.tenant_id`;

const POST_ORDER = 'ORDER BY p.created_at DESC, p.id DESC LIMIT ?';

/** De la fila a la publicación que viaja en la respuesta. */
function toPost(row: RowDataPacket): ArcsialPost {
  return {
    id: row.id as number,
    contentText: row.contentText as string,
    imageUrls: row.imageUrlsJson ? (JSON.parse(row.imageUrlsJson as string) as string[]) : [],
    visibility: row.visibility as PostVisibility,
    createdAt: row.createdAt as string,
    author: {
      handle: row.handle as string,
      displayName: row.displayName as string,
      avatarUrl: row.avatarUrl as string | null,
      actorType: row.actorType as ActorType,
    },
    canDelete: Number(row.canDelete) === 1,
  };
}

/** Inserta la publicación y devuelve su id. */
export async function insertPost(post: NewPost, executor: Executor = db): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO arcsial_posts (author_actor_id, author_user_id, content_text, image_urls_json, visibility)
     VALUES (?, ?, ?, ?, ?)`,
    [
      post.authorActorId,
      post.authorUserId,
      post.contentText,
      post.imageUrls.length > 0 ? JSON.stringify(post.imageUrls) : null,
      post.visibility,
    ]
  );
  return result.insertId;
}

/** Quién redactó la publicación y quién es el MU del Universo que la firma (si lo hay), o null. */
export async function findPostOwnership(
  postId: number,
  executor: Executor = db
): Promise<PostOwnership | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT p.author_user_id AS authorUserId, t.mu_user_id AS muUserId
     FROM arcsial_posts p
     JOIN arcsial_actors a ON a.id = p.author_actor_id
     LEFT JOIN tenants t ON t.id = a.tenant_id
     WHERE p.id = ?`,
    [postId]
  );
  return rows.length > 0 ? (rows[0] as unknown as PostOwnership) : null;
}

/** Borra la publicación. */
export async function deletePost(postId: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>('DELETE FROM arcsial_posts WHERE id = ?', [postId]);
}

/** Muro de un actor: PUBLIC siempre; FOLLOWERS y CONTACTS solo si `access` lo concede. */
export async function listWallPosts(
  viewer: { callerId: number; actorId: number; access: WallAccess },
  cursor: PostCursor,
  executor: Executor = db
): Promise<ArcsialPost[]> {
  const { callerId, actorId, access } = viewer;
  const [rows] = await executor.execute<RowDataPacket[]>(
    `${POST_SELECT}
     WHERE p.author_actor_id = ? AND p.id < ?
       AND (p.visibility = 'PUBLIC'
            OR (p.visibility = 'FOLLOWERS' AND ? = 1)
            OR (p.visibility = 'CONTACTS' AND ? = 1))
     ${POST_ORDER}`,
    [
      callerId,
      callerId,
      actorId,
      cursor.beforeId ?? NO_CURSOR,
      access.followers ? 1 : 0,
      access.contacts ? 1 : 0,
      cursor.limit,
    ]
  );
  return rows.map(toPost);
}

const FEED_WHERE = `WHERE p.id < ?
       AND (p.author_user_id = ?
            OR (p.visibility IN ('PUBLIC', 'FOLLOWERS')
                AND EXISTS (SELECT 1 FROM arcsial_follows f
                            WHERE f.follower_user_id = ? AND f.target_actor_id = p.author_actor_id)))
       AND NOT EXISTS (
         SELECT 1 FROM arcsial_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = a.user_id)
            OR (b.blocker_id = a.user_id AND b.blocked_id = ?)
       )`;

/**
 * Feed de la sesión: lo PUBLIC y FOLLOWERS de los actores que sigue, más lo que redactó. Una
 * persona con bloqueo en cualquier sentido no aparece aunque se le siguiera desde antes.
 */
export async function listFeedPosts(
  callerId: number,
  cursor: PostCursor,
  executor: Executor = db
): Promise<ArcsialPost[]> {
  const before = cursor.beforeId ?? NO_CURSOR;
  const [rows] = await executor.execute<RowDataPacket[]>(
    `${POST_SELECT}
     ${FEED_WHERE}
     ${POST_ORDER}`,
    [callerId, callerId, before, callerId, callerId, callerId, callerId, cursor.limit]
  );
  return rows.map(toPost);
}
