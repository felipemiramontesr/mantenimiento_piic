import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC130 F1 — SQL boundary for credentials/session: login, refresh, switch-tenant,
 * /me. `role_name` is derived via CASE (role_id=0 → 'GrayMan') since FC082 F3c3
 * dropped the `roles` table save its GrayMan row (Cond.5 grep CI, findUserByEmail
 * lineage). Several call-sites in auth.ts used byte-identical literal queries —
 * consolidated here into one function each rather than re-duplicated.
 */
type Executor = Pool | PoolConnection;

const USER_WITH_ROLE_AND_DEPARTMENT_SELECT = `SELECT u.*, (CASE WHEN u.role_id = 0 THEN 'GrayMan' ELSE NULL END) as role_name, cat.label as department_name
     FROM users u
     LEFT JOIN common_catalogs cat ON u.department_id = cat.id`;

/** All active users, unfiltered by identity — used by findUserByEmail's decrypt-and-compare fallback. */
export async function findAllActiveUsers(executor: Executor = db): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE is_active = 1',
    []
  );
  return rows;
}

/** User row (+role_name/department_name) by exact username — /login's primary lookup. */
export async function findUserWithRoleAndDepartmentByUsername(
  username: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `${USER_WITH_ROLE_AND_DEPARTMENT_SELECT} WHERE u.username = ?`,
    [username]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** User row (+role_name/department_name) by id, no is_active filter — findUserByEmail fallback + /me. */
export async function findUserWithRoleAndDepartmentById(
  id: number,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `${USER_WITH_ROLE_AND_DEPARTMENT_SELECT} WHERE u.id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Active user row (+role_name/department_name) by id — /refresh and /switch-tenant. */
export async function findActiveUserWithRoleAndDepartmentById(
  id: number,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `${USER_WITH_ROLE_AND_DEPARTMENT_SELECT} WHERE u.id = ? AND u.is_active = 1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}
