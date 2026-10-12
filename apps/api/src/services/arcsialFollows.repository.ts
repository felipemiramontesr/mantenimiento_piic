import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC210 F2 — SQL de `arcsial_follows` (migración 186): seguimiento unidireccional de una persona hacia
 * un actor (persona o Universo), sin aprobación de la otra parte.
 */
type Executor = Pool | PoolConnection;

/** Crea el seguimiento; si ya existía sale como ER_DUP_ENTRY (`uq_arcsial_follows`). */
export async function insertFollow(
  followerUserId: number,
  targetActorId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'INSERT INTO arcsial_follows (follower_user_id, target_actor_id) VALUES (?, ?)',
    [followerUserId, targetActorId]
  );
}

/** Retira el seguimiento, si existía. */
export async function deleteFollow(
  followerUserId: number,
  targetActorId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'DELETE FROM arcsial_follows WHERE follower_user_id = ? AND target_actor_id = ?',
    [followerUserId, targetActorId]
  );
}

/** ¿La persona sigue al actor? */
export async function isFollowing(
  followerUserId: number,
  targetActorId: number,
  executor: Executor = db
): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM arcsial_follows WHERE follower_user_id = ? AND target_actor_id = ? LIMIT 1',
    [followerUserId, targetActorId]
  );
  return rows.length > 0;
}

/** Cuántas personas siguen al actor. */
export async function countFollowers(actorId: number, executor: Executor = db): Promise<number> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM arcsial_follows WHERE target_actor_id = ?',
    [actorId]
  );
  return Number(rows[0].total);
}

/** A cuántos actores sigue la persona. */
export async function countFollowing(userId: number, executor: Executor = db): Promise<number> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM arcsial_follows WHERE follower_user_id = ?',
    [userId]
  );
  return Number(rows[0].total);
}
