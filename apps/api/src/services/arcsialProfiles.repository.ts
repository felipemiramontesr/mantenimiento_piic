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
