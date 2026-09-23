import { RowDataPacket } from 'mysql2';
import { verify as argon2Verify } from '@node-rs/argon2';
import EncryptionService from './encryption';
import * as SessionRepository from './authSession.repository';
import * as MfaRepository from './mfa.repository';
import * as CosmonautRepository from './cosmonaut.repository';
import {
  resolveAuthContext,
  resolveAuthContextForRefresh,
  resolveEffectivePermissions,
  deriveOwnerType,
  getAvailableTenants,
  isTenantAssignmentActive,
  ceilEffectivePermissions,
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
  if (img?.startsWith('data:')) {
    pic = img;
  } else if (img) {
    pic = `/v1/users/${user.id}/profile-image`;
  }
  return {
    id: user.id,
    uuid: user.uuid,
    username: user.username,
    fullName: user.full_name || user.fullName,
    // FC189 — `user.email` puede ser NULL (cuenta sin correo registrado, p. ej. Ω antes de FC188):
    // `decrypt()` hace `.split(':')` ANTES de su propio try/catch, así que un NULL sin guardia
    // truena con TypeError y tumba /login, /refresh y /switch-tenant (comparten esta función).
    // `''` en vez de pasar `null`: `MappedUser.email` es `string` y el resto del sistema (frontend
    // incluido) asume que siempre puede tratarlo como tal.
    email: user.email ? EncryptionService.decrypt(user.email) : '',
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
  | { ok: false; status: 401; errorCode: 'L3' | 'L4' }
  | { ok: false; status: 403; errorCode: 'ACCOUNT_PENDING_ACTIVATION' }
  | { ok: false; status: 200; errorCode: 'MFA_REQUIRED'; userId: number }
  | { ok: false; status: 200; errorCode: 'MFA_SETUP_REQUIRED'; userId: number; username: string };

/** FC185 F2 — Ω/MU mandatory, Arc opt-in (FC185 Invariante 4, 340_AN). `tenantId !== null` por sí
 *  solo NO basta para detectar "es MU": `assignmentsRoutes.ts` permite sub-usuarios con
 *  `cosmonaut_type: 'ARC'` y un Universo real asignado (verificado en código antes de asumir lo
 *  contrario) — así que un ARC con tenant sigue siendo opt-in, igual que un ARC itinerante puro.
 *  `findCosmonautType` es el único chequeo que distingue correctamente ambos casos. */
async function isMfaMandatoryRole(
  userId: number,
  roleId: number,
  tenantId: number | null
): Promise<boolean> {
  if (roleId === 0) return true;
  if (tenantId === null) return false;
  const cosmonautType = await CosmonautRepository.findCosmonautType(userId, tenantId);
  return cosmonautType === 'MU';
}

/** FC185 F2 — corre después de `resolveAuthContext`, antes de emitir sesión completa. Un
 *  credencial TOTP confirmada (enrolada por cualquier rol, opt-in incluido) siempre exige el
 *  segundo paso; si no existe ninguna y el rol es mandatorio, bloquea con `MFA_SETUP_REQUIRED` en
 *  vez de dejarlo operar sin protección. */
async function evaluateMfaGate(
  mapped: MappedUser,
  tenantId: number | null
): Promise<LoginResult | null> {
  const credential = await MfaRepository.findCredentialByUserId(mapped.id, 'totp');
  if (credential?.is_confirmed) {
    return { ok: false, status: 200, errorCode: 'MFA_REQUIRED', userId: mapped.id };
  }
  if (await isMfaMandatoryRole(mapped.id, mapped.roleId, tenantId)) {
    return {
      ok: false,
      status: 200,
      errorCode: 'MFA_SETUP_REQUIRED',
      userId: mapped.id,
      username: mapped.username,
    };
  }
  return null;
}

/** POST /login — preserves the L3 (user not found) vs L4 (bad password) distinction exactly.
 *  FC177 F1 — the `is_active` gate runs AFTER password verification (Cond.R-177 R2, Bravo):
 *  checking it earlier would leak "this account exists and is pending" to a caller who never
 *  proved they know the password, the same anti-enumeration posture as L3/L4 already have. */
export async function login(username: string, password: string): Promise<LoginResult> {
  let user = await SessionRepository.findUserWithRoleAndDepartmentByUsername(username);
  user ??= await findUserByEmail(username);
  if (!user) {
    return { ok: false, status: 401, errorCode: 'L3' };
  }
  const hash = user.password_hash || user.passwordHash;
  if (!hash || !(await argon2Verify(hash, password))) {
    return { ok: false, status: 401, errorCode: 'L4' };
  }
  if (!user.is_active) {
    return { ok: false, status: 403, errorCode: 'ACCOUNT_PENDING_ACTIVATION' };
  }
  const mapped = mapUserResponse(user);
  // FC 082 F3b — cutover al chasis cosmonauta (089_AN §9, O✓Alfa/R✓Bravo). Ω
  // (roleId=0) nunca toca resolveEffectivePermissions (§6.4). Puede lanzar
  // MultiMembershipHaltError — se propaga al caller (route), sin capturar aquí.
  const { tenantId, permissions, ownerType, availableTenants } = await resolveAuthContext(
    mapped.id,
    mapped.roleId
  );
  const mfaGate = await evaluateMfaGate(mapped, tenantId);
  if (mfaGate) return mfaGate;
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

  const [rawPermissions, ownerType, availableTenants] = await Promise.all([
    resolveEffectivePermissions(mapped.id, tenantId),
    deriveOwnerType(tenantId),
    getAvailableTenants(mapped.id),
  ]);
  // FC193 F4 — mismo techo de permisos que login/refresh/me (Cond.7 paridad); Ω nunca llega aquí
  // (short-circuit OMEGA_NO_TENANT arriba).
  const permissions = await ceilEffectivePermissions(rawPermissions, tenantId);

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
