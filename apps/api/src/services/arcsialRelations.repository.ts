import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC209 F2 — SQL de contactos bilaterales (`arcsial_contacts`, par ordenado low < high) y bloqueos
 * (`arcsial_blocks`). Un bloqueo cuenta en cualquier sentido.
 */
type Executor = Pool | PoolConnection;

/** El par en el orden que exige `chk_arcsial_contacts_order`. */
function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

/** ¿Existe un bloqueo entre ambos, en cualquier sentido? */
export async function isBlockedEitherWay(
  a: number,
  b: number,
  executor: Executor = db
): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT 1 FROM arcsial_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
    [a, b, b, a]
  );
  return rows.length > 0;
}

/** ¿Ya son contactos? */
export async function areContacts(a: number, b: number, executor: Executor = db): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM arcsial_contacts WHERE user_id_low = ? AND user_id_high = ? LIMIT 1',
    orderedPair(a, b)
  );
  return rows.length > 0;
}

/** Crea el contacto; si ya existía no hace nada (sin INSERT IGNORE: no esconde otros errores). */
export async function insertContact(a: number, b: number, executor: Executor): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO arcsial_contacts (user_id_low, user_id_high) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE user_id_low = user_id_low`,
    orderedPair(a, b)
  );
}

/** Retira el contacto, si existía. */
export async function deleteContact(a: number, b: number, executor: Executor): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'DELETE FROM arcsial_contacts WHERE user_id_low = ? AND user_id_high = ?',
    orderedPair(a, b)
  );
}

/** Registra el bloqueo de `blockerId` hacia `blockedId` (repetirlo no hace nada). */
export async function insertBlock(
  blockerId: number,
  blockedId: number,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO arcsial_blocks (blocker_id, blocked_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE blocker_id = blocker_id`,
    [blockerId, blockedId]
  );
}

/** ¿Existe el usuario? (destino de un bloqueo). */
export async function userExists(userId: number, executor: Executor = db): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>('SELECT 1 FROM users WHERE id = ?', [
    userId,
  ]);
  return rows.length > 0;
}
