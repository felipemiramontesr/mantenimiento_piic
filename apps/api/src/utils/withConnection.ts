import { PoolConnection } from 'mysql2/promise';
import db from '../services/db';

/**
 * Acquires a pool connection, runs callback, then releases the connection.
 * Errors thrown by callback propagate to caller (no catch, so the exception
 * is in flight during finally — both V8 branches of the finally are covered).
 */
async function withConnection<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await db.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

export default withConnection;
