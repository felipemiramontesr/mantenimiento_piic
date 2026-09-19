import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC188 F1 — frontera SQL del diagnóstico de correo. Lee SOLO lo necesario (usuario + correo
 * cifrado), nunca `SELECT *`: no hay razón para traer `password_hash` a memoria por un correo de
 * prueba. Mismo molde de `Executor`/`db` por defecto que `mfa.repository.ts`.
 */
type Executor = Pool | PoolConnection;

export interface UserContactRow extends RowDataPacket {
  id: number;
  username: string;
  email: string | null;
}

/** Usuario y correo (cifrado en reposo) de la cuenta `userId`, o `null` si no existe. */
export async function findUserContactById(
  userId: number,
  executor: Executor = db
): Promise<UserContactRow | null> {
  const [rows] = await executor.execute<UserContactRow[]>(
    'SELECT id, username, email FROM users WHERE id = ?',
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}
