import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC209 F2 — SQL de `arcsial_profiles` (migración 185): perfil público con @handle. Las búsquedas son
 * por handle EXACTO (`=`), nunca por correo, nombre, prefijo ni LIKE (anti-enumeración, R 538_AN).
 */
type Executor = Pool | PoolConnection;

export interface ArcsialProfile {
  readonly userId: number;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

interface ProfileRow extends RowDataPacket {
  userId: number;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

/** `users.uuid` del usuario recién insertado (DEFAULT uuid()), leído en su misma TX. */
export async function findUserUuid(userId: number, executor: Executor): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>('SELECT uuid FROM users WHERE id = ?', [
    userId,
  ]);
  return rows.length > 0 ? (rows[0].uuid as string | null) ?? null : null;
}

/** Inserta el perfil; un handle tomado sale como ER_DUP_ENTRY (el llamador prueba el siguiente). */
export async function insertProfile(
  profile: Omit<ArcsialProfile, 'avatarUrl'>,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'INSERT INTO arcsial_profiles (user_id, handle, display_name) VALUES (?, ?, ?)',
    [profile.userId, profile.handle, profile.displayName]
  );
}

/** Perfil por handle exacto, o null. */
export async function findProfileByHandle(
  handle: string,
  executor: Executor = db
): Promise<ArcsialProfile | null> {
  const [rows] = await executor.execute<ProfileRow[]>(
    `SELECT user_id AS userId, handle, display_name AS displayName, avatar_url AS avatarUrl
     FROM arcsial_profiles WHERE handle = ?`,
    [handle]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Perfil propio por id de usuario, o null. */
export async function findProfileByUserId(
  userId: number,
  executor: Executor = db
): Promise<ArcsialProfile | null> {
  const [rows] = await executor.execute<ProfileRow[]>(
    `SELECT user_id AS userId, handle, display_name AS displayName, avatar_url AS avatarUrl
     FROM arcsial_profiles WHERE user_id = ?`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** FC209 F3 — el Universo del que el usuario es MU (`tenants.mu_user_id`), para la UI; o null. */
export async function findMuUniverse(
  userId: number,
  executor: Executor = db
): Promise<{ id: number; label: string } | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id, label FROM tenants WHERE mu_user_id = ? ORDER BY id LIMIT 1',
    [userId]
  );
  return rows.length > 0 ? { id: rows[0].id as number, label: rows[0].label as string } : null;
}

export interface ContactEntry {
  readonly id: number;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
}

export interface BlockEntry {
  readonly blockedId: number;
  readonly handle: string | null;
  readonly displayName: string | null;
  readonly createdAt: string;
}

/** Contactos vigentes del usuario con el perfil público de la otra parte (sin correo). */
export async function listContacts(
  userId: number,
  executor: Executor = db
): Promise<ContactEntry[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT p.user_id AS id, p.handle, p.display_name AS displayName, p.avatar_url AS avatarUrl,
            c.created_at AS createdAt
     FROM arcsial_contacts c
     JOIN arcsial_profiles p ON p.user_id = IF(c.user_id_low = ?, c.user_id_high, c.user_id_low)
     WHERE c.user_id_low = ? OR c.user_id_high = ?
     ORDER BY p.display_name, p.handle`,
    [userId, userId, userId]
  );
  return rows as ContactEntry[];
}

/** Usuarios que el usuario bloqueó (solo los propios: quién lo bloqueó a él no se revela). */
export async function listBlocks(userId: number, executor: Executor = db): Promise<BlockEntry[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT b.blocked_id AS blockedId, p.handle, p.display_name AS displayName, b.created_at AS createdAt
     FROM arcsial_blocks b
     LEFT JOIN arcsial_profiles p ON p.user_id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows as BlockEntry[];
}

/** Handle actual del usuario, o null si aún no tiene perfil. */
export async function findHandleByUserId(
  userId: number,
  executor: Executor = db
): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT handle FROM arcsial_profiles WHERE user_id = ?',
    [userId]
  );
  return rows.length > 0 ? (rows[0].handle as string) : null;
}

/** Cambia el handle propio; un handle de otro usuario sale como ER_DUP_ENTRY. */
export async function updateHandle(
  userId: number,
  handle: string,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE arcsial_profiles SET handle = ? WHERE user_id = ?',
    [handle, userId]
  );
}
