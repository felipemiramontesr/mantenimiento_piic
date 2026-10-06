import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC204 F3 — SQL boundary for the sovereign platform-users console (Ω only): every cosmonaut with
 * the Universo it belongs to. A user with no membership is "itinerant" (tenantId null).
 */
type Executor = Pool | PoolConnection;

/** `tenantId > 0` → one Universo; `'itinerant'` → users with no membership; absent → everyone. */
export type PlatformUserScope = number | 'itinerant' | undefined;

export interface PlatformUserFilter {
  readonly scope: PlatformUserScope;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
}

export interface PlatformUserRow extends RowDataPacket {
  id: number;
  username: string;
  fullName: string | null;
  email: string;
  isActive: number;
  tenantId: number | null;
  tenantName: string | null;
  cosmonautType: 'MU' | 'ARC' | null;
}

export interface UserUniverseRow extends RowDataPacket {
  userId: number;
  tenantId: number | null;
  tenantName: string | null;
}

const FROM_PLATFORM_USERS = `FROM users u
  LEFT JOIN tenant_user_memberships m ON m.user_id = u.id
  LEFT JOIN tenants t ON t.id = m.owner_id
  LEFT JOIN user_billing_profiles ubp ON ubp.user_id = u.id`;

/** `%`, `_` and `\` typed by Ω are literals, not LIKE wildcards. */
function likeContains(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

/** WHERE clause + params for the scope and the text search (name, username, email, RFC). */
function buildWhere(filter: PlatformUserFilter): { sql: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filter.scope === 'itinerant') {
    clauses.push('m.id IS NULL');
  } else if (typeof filter.scope === 'number') {
    clauses.push('m.owner_id = ?');
    params.push(filter.scope);
  }
  if (filter.search) {
    const like = likeContains(filter.search);
    clauses.push('(u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR ubp.rfc LIKE ?)');
    params.push(like, like, like, like);
  }
  return { sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/** One page of (user, Universo) rows plus the total of rows matching the same filter. */
export async function listPlatformUsers(
  filter: PlatformUserFilter,
  executor: Executor = db
): Promise<{ rows: PlatformUserRow[]; total: number }> {
  const where = buildWhere(filter);
  const [rows] = await executor.execute<PlatformUserRow[]>(
    `SELECT u.id, u.username, u.full_name AS fullName, u.email, u.is_active AS isActive,
            t.id AS tenantId, t.label AS tenantName, m.cosmonaut_type AS cosmonautType
     ${FROM_PLATFORM_USERS} ${where.sql}
     ORDER BY u.id, t.id
     LIMIT ? OFFSET ?`,
    [...where.params, filter.limit, filter.offset]
  );
  const [count] = await executor.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total ${FROM_PLATFORM_USERS} ${where.sql}`,
    where.params
  );
  return { rows, total: Number(count[0]?.total ?? 0) };
}

/** The user (if it exists) and each Universo it belongs to; no membership → one row, tenantId null. */
export async function findUserUniverses(
  userId: number,
  executor: Executor = db
): Promise<UserUniverseRow[]> {
  const [rows] = await executor.execute<UserUniverseRow[]>(
    `SELECT u.id AS userId, t.id AS tenantId, t.label AS tenantName
     FROM users u
     LEFT JOIN tenant_user_memberships m ON m.user_id = u.id
     LEFT JOIN tenants t ON t.id = m.owner_id
     WHERE u.id = ?`,
    [userId]
  );
  return rows;
}
