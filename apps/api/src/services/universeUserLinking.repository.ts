import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC177 F3 — Cosmology_Universe_User_Linking_Backend. SQL boundary split out of
 * `cosmology.repository.ts` (which hit ESLint's project-wide `max-lines:400` ceiling) — same
 * relationship as FC177 F2's `publicSignup.repository.ts`: a small, focused module for one
 * slice of the Cosmology domain (linking an existing quarantined user to a new Universo).
 */
type Executor = Pool | PoolConnection;

export interface PendingUserRow extends RowDataPacket {
  id: number;
  username: string;
  full_name: string;
  email: string;
  rfc: string;
  razon_social: string;
}

/** FC179 — the candidate pool has no natural ceiling (unlike a fixed catalog): a queue that
 *  drains as Ω links candidates, but can back up (neglect, spam/bot signups). `PENDING_USERS_LIMIT`
 *  caps memory/DOM exposure per request; `total` lets the UI say "showing 200 of N" instead of
 *  silently truncating. */
const PENDING_USERS_LIMIT = 200;

/** FC182 (331_AN, Alfa) — under Modelo B, `is_active` is no longer a "not yet linked" proxy:
 *  every self-registered user is active from signup (global `Arc` role, Arcsial-only). A
 *  candidate is now `is_active = 1` (in good standing, not admin-suspended) AND absent from
 *  `tenant_user_memberships` (never linked to a Universo). */
const PENDING_USERS_WHERE = `WHERE u.is_active = 1
       AND NOT EXISTS (SELECT 1 FROM tenant_user_memberships tum WHERE tum.user_id = u.id)`;

/** F3-I1 (FC177), FIFO-limited + counted (FC179), redefined for Modelo B (FC182) — active Arc
 *  itinerants with a billing snapshot and no tenant yet, oldest registration first
 *  (`created_at ASC`) so nobody waits indefinitely at the back of an unbounded queue. */
export async function findPendingUsers(
  executor: Executor = db
): Promise<{ rows: PendingUserRow[]; total: number }> {
  const [rows] = await executor.execute<PendingUserRow[]>(
    `SELECT u.id, u.username, u.full_name, u.email, ubp.rfc, ubp.razon_social
     FROM users u
     JOIN user_billing_profiles ubp ON ubp.user_id = u.id
     ${PENDING_USERS_WHERE}
     ORDER BY u.created_at ASC
     LIMIT ?`,
    [PENDING_USERS_LIMIT]
  );
  const [countRows] = await executor.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM users u
     JOIN user_billing_profiles ubp ON ubp.user_id = u.id
     ${PENDING_USERS_WHERE}`,
    []
  );
  return { rows, total: Number(countRows[0]?.total ?? 0) };
}

export interface BillingProfileRow extends RowDataPacket {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  uso_cfdi: string;
  telefono: string | null;
}

/** F3-I2 — the signup-time fiscal snapshot for userId, or null if never captured (fail-closed
 *  signal — a user without one isn't a valid linking candidate, Cond.R-177 R3). */
export async function findBillingProfile(
  userId: number,
  executor: Executor = db
): Promise<BillingProfileRow | null> {
  const [rows] = await executor.execute<BillingProfileRow[]>(
    'SELECT rfc, razon_social, regimen_fiscal, uso_cfdi, telefono FROM user_billing_profiles WHERE user_id = ?',
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Minimal row for the fail-closed pre-checks (`is_active`) — the whole `users.*` row isn't
 *  needed, unlike the seed-flow's lookups elsewhere. */
export async function findUserActiveState(
  userId: number,
  executor: Executor = db
): Promise<{ isActive: boolean } | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT is_active FROM users WHERE id = ?',
    [userId]
  );
  return rows.length > 0 ? { isActive: Boolean(rows[0].is_active) } : null;
}

/** F3-I3(a) — activates a quarantined user at link time (`is_active: false → true`). */
export async function activateUser(userId: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>('UPDATE users SET is_active = 1 WHERE id = ?', [userId]);
}

export interface BillingProfileInput {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  telefono: string | null;
}

/** F3-I3(b) — migrates the signup-time fiscal snapshot into the new tenant's own profile row.
 *  `codigo_postal_fiscal` is deliberately NOT copied — `tenant_profiles` models geography via
 *  `neighborhood_id`, a different shape; the raw CP stays recorded in `user_billing_profiles`
 *  permanently (migración 175). */
export async function insertTenantProfileFromBilling(
  tenantId: number,
  billing: BillingProfileInput,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO tenant_profiles (owner_id, rfc, razon_social, regimen_fiscal, uso_cfdi, telefono)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      billing.rfc,
      billing.razonSocial,
      billing.regimenFiscal,
      billing.usoCfdi,
      billing.telefono,
    ]
  );
}
