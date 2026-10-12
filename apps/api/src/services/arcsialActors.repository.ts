import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC210 F2 — SQL de `arcsial_actors` (migración 186): registro único de @handle para personas (USER) y
 * universos (UNIVERSE). Fuente de lectura de los perfiles de Arcsial V2. La búsqueda por nombre es la
 * única consulta con LIKE y va acotada (visibles, sin bloqueados, máximo 10).
 */
type Executor = Pool | PoolConnection;

export type ActorType = 'USER' | 'UNIVERSE';

export interface ArcsialActor {
  readonly id: number;
  readonly actorType: ActorType;
  readonly userId: number | null;
  readonly tenantId: number | null;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly isSearchable: boolean;
  /** MU del Universo (`tenants.mu_user_id`); null en un actor USER o en un Universo sin MU. */
  readonly muUserId: number | null;
}

export interface ActorCard {
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly actorType: ActorType;
}

/** Campos editables de la presentación pública (PATCH /social/actors/profile). */
export interface ActorProfilePatch {
  readonly displayName?: string;
  readonly bio?: string | null;
  readonly avatarUrl?: string | null;
  readonly isSearchable?: boolean;
}

const ACTOR_SELECT = `SELECT a.id, a.actor_type AS actorType, a.user_id AS userId, a.tenant_id AS tenantId,
       a.handle, a.display_name AS displayName, a.avatar_url AS avatarUrl, a.bio,
       a.is_searchable AS isSearchable, t.mu_user_id AS muUserId
     FROM arcsial_actors a LEFT JOIN tenants t ON t.id = a.tenant_id`;

/** Resultados máximos de la búsqueda por nombre (R 551_AN). */
export const SEARCH_LIMIT = 10;

/** De la fila al actor (`is_searchable` llega como 0/1). */
function toActor(row: RowDataPacket): ArcsialActor {
  return { ...(row as unknown as ArcsialActor), isSearchable: Number(row.isSearchable) === 1 };
}

/** Primer actor que cumple `where`, o null. */
async function findActor(
  where: string,
  value: string | number,
  executor: Executor
): Promise<ArcsialActor | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(`${ACTOR_SELECT} WHERE ${where}`, [value]);
  return rows.length > 0 ? toActor(rows[0]) : null;
}

/** Actor por handle exacto, o null. */
export async function findActorByHandle(
  handle: string,
  executor: Executor = db
): Promise<ArcsialActor | null> {
  return findActor('a.handle = ?', handle, executor);
}

/** Actor USER de una persona, o null. */
export async function findActorByUserId(
  userId: number,
  executor: Executor = db
): Promise<ArcsialActor | null> {
  return findActor('a.user_id = ?', userId, executor);
}

/** Actor UNIVERSE de un tenant, o null. */
export async function findActorByTenantId(
  tenantId: number,
  executor: Executor = db
): Promise<ArcsialActor | null> {
  return findActor('a.tenant_id = ?', tenantId, executor);
}

/** Alta del actor de una persona; un handle tomado sale como ER_DUP_ENTRY. */
export async function insertUserActor(
  actor: { userId: number; handle: string; displayName: string },
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    "INSERT INTO arcsial_actors (actor_type, user_id, handle, display_name) VALUES ('USER', ?, ?, ?)",
    [actor.userId, actor.handle, actor.displayName]
  );
}

/** Alta del actor de un Universo; un handle tomado sale como ER_DUP_ENTRY. */
export async function insertUniverseActor(
  actor: { tenantId: number; handle: string; displayName: string },
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    "INSERT INTO arcsial_actors (actor_type, tenant_id, handle, display_name) VALUES ('UNIVERSE', ?, ?, ?)",
    [actor.tenantId, actor.handle, actor.displayName]
  );
}

/** Cambia el handle del actor; un handle de otro actor sale como ER_DUP_ENTRY. */
export async function updateActorHandle(
  actorId: number,
  handle: string,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>('UPDATE arcsial_actors SET handle = ? WHERE id = ?', [
    handle,
    actorId,
  ]);
}

/** Espejo del handle en `arcsial_profiles` (misma TX que `updateActorHandle`). */
export async function updateProfileHandle(
  userId: number,
  handle: string,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE arcsial_profiles SET handle = ? WHERE user_id = ?',
    [handle, userId]
  );
}

/** Reescribe la presentación del actor con sus valores ya resueltos. */
export async function updateActorProfile(
  actorId: number,
  profile: Required<ActorProfilePatch>,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE arcsial_actors SET display_name = ?, bio = ?, avatar_url = ?, is_searchable = ?
     WHERE id = ?`,
    [profile.displayName, profile.bio, profile.avatarUrl, profile.isSearchable ? 1 : 0, actorId]
  );
}

/** Espejo de nombre y avatar en `arcsial_profiles` (misma TX que `updateActorProfile`). */
export async function updateProfilePresentation(
  userId: number,
  profile: { displayName: string; avatarUrl: string | null },
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE arcsial_profiles SET display_name = ?, avatar_url = ? WHERE user_id = ?',
    [profile.displayName, profile.avatarUrl, userId]
  );
}

/** Escapa los comodines de LIKE con `!` (el carácter de ESCAPE) para que el texto se busque literal. */
function likeLiteral(text: string): string {
  return text.replaceAll(/[!%_]/g, '!$&');
}

/**
 * Actores visibles cuyo nombre contiene `name`. Excluye a los que desactivaron la búsqueda y a las
 * personas con bloqueo en cualquier sentido; un Universo no se esconde por bloqueos (R 562_AN).
 */
export async function searchActorsByName(
  callerId: number,
  name: string,
  executor: Executor = db
): Promise<ActorCard[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT a.handle, a.display_name AS displayName, a.avatar_url AS avatarUrl, a.actor_type AS actorType
     FROM arcsial_actors a
     WHERE a.is_searchable = 1 AND a.display_name LIKE ? ESCAPE '!'
       AND NOT EXISTS (
         SELECT 1 FROM arcsial_blocks b
         WHERE (b.blocker_id = ? AND b.blocked_id = a.user_id)
            OR (b.blocker_id = a.user_id AND b.blocked_id = ?)
       )
     ORDER BY a.display_name, a.handle LIMIT ${SEARCH_LIMIT}`,
    [`%${likeLiteral(name)}%`, callerId, callerId]
  );
  return rows as ActorCard[];
}
