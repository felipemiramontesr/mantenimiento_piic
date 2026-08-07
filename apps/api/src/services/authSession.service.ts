import { RowDataPacket } from 'mysql2';
import { verify as argon2Verify } from '@node-rs/argon2';
import EncryptionService from './encryption';
import * as SessionRepository from './authSession.repository';
import {
  resolveAuthContext,
  resolveAuthContextForRefresh,
  resolveEffectivePermissions,
  deriveOwnerType,
  getAvailableTenants,
  isTenantAssignmentActive,
} from '../middleware/cosmonautMiddleware';

/**
 * FC130 F1 — orchestration layer for auth.ts's session endpoints (I2 zero-SQL):
 * login, refresh, switch-tenant, /me. Returns plain data or discriminated
 * `{ ok, status, code, message }` results; never touches FastifyReply
 * (Cond.R-130-E4) — the route formats the HTTP response and signs JWTs/cookies.
 */

export interface MappedUser {
  id: number;
  uuid: string;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  department: string;
  imageUrl: string | null;
  employeeNumber: string | null;
  is_active: boolean;
}

/** Normalizes a raw `users` row (+ optional role/department joins) into the API's user shape. */
export function mapUserResponse(user: RowDataPacket): MappedUser {
  let rid = user.role_id;
  if (rid === undefined) {
    rid = user.roleId;
  }
  let rname = user.role_name;
  if (!rname) {
    rname = user.roleName;
  }
  let img = user.profile_picture_url;
  if (!img) {
    img = user.imageUrl;
  }
  // Plan Omega: data URIs pass through directly, legacy filenames use endpoint
  let pic = null;
  if (img && img.startsWith('data:')) {
    pic = img;
  } else if (img) {
    pic = `/v1/users/${user.id}/profile-image`;
  }
  return {
    id: user.id,
    uuid: user.uuid,
    username: user.username,
    fullName: user.full_name || user.fullName,
    email: EncryptionService.decrypt(user.email),
    roleId: rid,
    roleName: rname,
    department: user.department_name || user.department,
    imageUrl: pic,
    employeeNumber: user.employee_number || user.employeeNumber || null,
    is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
  };
}

/** Decrypt-and-compare fallback when username lookup misses — username may be an email. */
export async function findUserByEmail(username: string): Promise<RowDataPacket | null> {
  const candidates = await SessionRepository.findAllActiveUsers();
  const found = candidates.find((u) => {
    try {
      return EncryptionService.decrypt(u.email) === username;
    } catch {
      return false;
    }
  });
  if (!found) return null;
  return SessionRepository.findUserWithRoleAndDepartmentById(found.id as number);
}

export type LoginResult =
  | {
      ok: true;
      userId: number;
      username: string;
      mapped: MappedUser;
      tenantId: number | null;
      permissions: string[];
      ownerType: string | null;
      availableTenants: number[];
    }
  | { ok: false; status: 401; errorCode: 'L3' | 'L4' };

/** POST /login — preserves the L3 (user not found) vs L4 (bad password) distinction exactly. */
export async function login(username: string, password: string): Promise<LoginResult> {
  let user = await SessionRepository.findUserWithRoleAndDepartmentByUsername(username);
  if (!user) {
    user = await findUserByEmail(username);
  }
  if (!user) {
    return { ok: false, status: 401, errorCode: 'L3' };
  }
  const hash = user.password_hash || user.passwordHash;
  if (!hash || !(await argon2Verify(hash, password))) {
    return { ok: false, status: 401, errorCode: 'L4' };
  }
  const mapped = mapUserResponse(user);
  // FC 082 F3b — cutover al chasis cosmonauta (089_AN §9, O✓Alfa/R✓Bravo). Ω
  // (roleId=0) nunca toca resolveEffectivePermissions (§6.4). Puede lanzar
  // MultiMembershipHaltError — se propaga al caller (route), sin capturar aquí.
  const { tenantId, permissions, ownerType, availableTenants } = await resolveAuthContext(
    mapped.id,
    mapped.roleId
  );
  return {
    ok: true,
    userId: user.id,
    username: user.username,
    mapped,
    tenantId,
    permissions,
    ownerType,
    availableTenants,
  };
}

export type RefreshResult =
  | {
      ok: true;
      userId: number;
      username: string;
      mapped: MappedUser;
      tenantId: number | null;
      permissions: string[];
      ownerType: string | null;
      availableTenants: number[];
    }
  | { ok: false; status: 401; errorCode: 'USER_NOT_FOUND' };

/** POST /refresh — resolves the active user + re-derived auth context for a validated refresh JWT. */
export async function refresh(
  userId: number,
  claimedTenantId: number | null | undefined
): Promise<RefreshResult> {
  const user = await SessionRepository.findActiveUserWithRoleAndDepartmentById(userId);
  if (!user) {
    return { ok: false, status: 401, errorCode: 'USER_NOT_FOUND' };
  }
  const mapped = mapUserResponse(user);
  // FC 082 F3b §9.2.1 — si el token trae tenant_id y la asignación sigue activa,
  // se re-firma CON ESE tenant (evita revertir un switch-tenant en silencio).
  const { tenantId, permissions, ownerType, availableTenants } = await resolveAuthContextForRefresh(
    mapped.id,
    mapped.roleId,
    claimedTenantId
  );
  return {
    ok: true,
    userId: user.id,
    username: user.username,
    mapped,
    tenantId,
    permissions,
    ownerType,
    availableTenants,
  };
}

export type SwitchTenantResult =
  | {
      ok: true;
      userId: number;
      username: string;
      mapped: MappedUser;
      tenantId: number;
      permissions: string[];
      ownerType: string | null;
      availableTenants: number[];
    }
  | { ok: false; status: number; code: string; message?: string };

/** FC 082 F3b §9.2 (089_AN, O✓Alfa Opción B/R✓Bravo Cond.2+R2b) — switcher de
 *  Universo activo. Nunca confía tenantId/permissions/ownerType del cliente:
 *  valida asignación activa, recalcula todo server-side.
 */
export async function switchTenant(
  callerId: number,
  callerRoleId: number,
  tenantIdInput: unknown
): Promise<SwitchTenantResult> {
  if (callerRoleId === 0) {
    return { ok: false, status: 400, code: 'OMEGA_NO_TENANT', message: 'Ω no tiene Universo' };
  }
  if (typeof tenantIdInput !== 'number') {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'tenantId requerido' };
  }
  const tenantId = tenantIdInput;

  const allowed = await isTenantAssignmentActive(callerId, tenantId);
  if (!allowed) {
    return { ok: false, status: 403, code: 'FORBIDDEN', message: 'Sin asignación en ese Universo' };
  }

  const user = await SessionRepository.findActiveUserWithRoleAndDepartmentById(callerId);
  if (!user) {
    return { ok: false, status: 404, code: 'NOT_FOUND' };
  }
  const mapped = mapUserResponse(user);

  const [permissions, ownerType, availableTenants] = await Promise.all([
    resolveEffectivePermissions(mapped.id, tenantId),
    deriveOwnerType(tenantId),
    getAvailableTenants(mapped.id),
  ]);

  return {
    ok: true,
    userId: user.id,
    username: user.username,
    mapped,
    tenantId,
    permissions,
    ownerType,
    availableTenants,
  };
}

export type GetMeResult = {
  mapped: MappedUser;
  permissions: string[];
  tenantId: number | null;
  ownerType: string | null;
  availableTenants: number[];
} | null;

/** GET /me — Cond.7 F3b "paridad login/me": misma resolución que /refresh, anclada al tenant del JWT. */
export async function getMe(
  userId: number,
  claimedTenantId: number | null | undefined
): Promise<GetMeResult> {
  const user = await SessionRepository.findUserWithRoleAndDepartmentById(userId);
  if (!user) return null;
  const { tenantId, permissions, ownerType, availableTenants } = await resolveAuthContextForRefresh(
    userId,
    user.role_id as number,
    claimedTenantId
  );
  return { mapped: mapUserResponse(user), permissions, tenantId, ownerType, availableTenants };
}
