import type { PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { hash as argon2Hash } from '@node-rs/argon2';
import { userUpdateSchema } from '@mantenimiento/contracts';
import db from './db';
import EncryptionService from './encryption';
import { recordAuditLog } from './auditService';
import FleetService from './fleetService';
import withConnection from '../utils/withConnection';
import * as UserRepository from './authUserManagement.repository';
import { antiEscalationGuard, resolvePrimaryTenant } from '../middleware/cosmonautMiddleware';
import { mapUserResponse, MappedUser } from './authSession.service';

/**
 * FC130 F1 — orchestration layer for auth.ts's user-administration endpoints
 * (I2 zero-SQL): list/update/delete users, owner-membership management,
 * GrayMan cosmonaut sync, and the `/users/:uuid/node` profile view. Returns
 * plain data or discriminated `{ ok, status, code, message }` results; never
 * touches FastifyReply (Cond.R-130-E4).
 */

/** BOLA scope: `null` = unrestricted (Ω or non-scoped actor); array = restricted to those owner IDs. */
export const resolveOwnerScope = async (user: {
  id: number;
  permissions?: string[];
}): Promise<number[] | null> => {
  const { id, permissions } = user;
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

/** True if targetUserId belongs to at least one owner in ownerScope. */
export async function isUserInOwnerScope(
  connection: PoolConnection,
  targetUserId: string,
  ownerScope: number[]
): Promise<boolean> {
  const ownerIds = await UserRepository.findOwnerMembershipIdsByUserId(targetUserId, connection);
  return ownerIds.some((oid) => ownerScope.includes(oid));
}

export type GetUserOwnersResult =
  | { ok: true; data: RowDataPacket[] }
  | { ok: false; status: number; code: string; message: string };

/** GET /users/:id/owners — pool-level scope check (no transaction needed for a read). */
export async function getUserOwners(
  userId: string,
  ownerScope: number[] | null
): Promise<GetUserOwnersResult> {
  if (ownerScope !== null) {
    const targetOwnerIds = await UserRepository.findOwnerMembershipIdsByUserId(userId);
    const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
    if (!hasOverlap) {
      return { ok: false, status: 403, code: 'FORBIDDEN', message: 'User outside owner scope' };
    }
  }
  const data = await UserRepository.findOwnerDetailsByUserId(userId);
  return { ok: true, data };
}

/** GET /users — BOLA-scoped listing; empty owner scope short-circuits to []. */
export async function listUsers(
  ownerScope: number[] | null,
  role: string | undefined
): Promise<MappedUser[]> {
  if (ownerScope !== null && ownerScope.length === 0) return [];
  const rows = await UserRepository.findUsersByFilters(ownerScope, role);
  return rows.map(mapUserResponse);
}

export type GetUserNodeResult =
  | {
      ok: true;
      data: {
        user: RowDataPacket & { email: string; role_name: string | null };
        permissions: RowDataPacket[];
        recentRoutes: RowDataPacket[];
      };
    }
  | { ok: false; status: number; code?: string; message: string };

/** GET /users/:uuid/node — Sovereign node: full profile + permissions + recent activity. */
export async function getUserNode(
  uuid: string,
  ownerScope: number[] | null
): Promise<GetUserNodeResult> {
  const user = await UserRepository.findUserWithDepartmentByUuid(uuid);
  if (!user) {
    return { ok: false, status: 404, message: 'Usuario no encontrado' };
  }

  if (ownerScope !== null) {
    const targetOwnerIds = await UserRepository.findOwnerMembershipIdsByUserId(user.id as number);
    const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
    if (!hasOverlap) {
      return { ok: false, status: 403, code: 'FORBIDDEN', message: 'User outside owner scope' };
    }
  }

  // FC 082 F3c Cond.1 (Bravo) — R3: permisos resueltos vía el chasis cosmonauta
  // para el tenant real del usuario objetivo. Ω (role_id=0) no tiene filas
  // propias — su poder es el bypass runtime '*', no un set almacenado. Puede
  // lanzar MultiMembershipHaltError — se propaga al caller (route).
  let permRows: RowDataPacket[] = [];
  let roleName: string | null;
  if ((user.role_id as number) === 0) {
    roleName = 'GrayMan';
  } else {
    const tenantId = await resolvePrimaryTenant(user.id as number);
    permRows = await UserRepository.findPermissionDetailsForUserInTenant(
      user.id as number,
      tenantId
    );
    roleName = await UserRepository.findPrimaryCosmonautRoleName(user.id as number);
  }

  const routeRows = await UserRepository.findRecentRoutesByDriverId(user.id as number);
  const emailDecrypted = EncryptionService.decrypt(user.email as string);

  return {
    ok: true,
    data: {
      user: { ...user, email: emailDecrypted, role_name: roleName },
      permissions: permRows,
      recentRoutes: routeRows,
    },
  };
}

/** Extraído del handler PATCH /users/:id (sonarjs/cognitive-complexity) — cada
 *  campo opcional del payload se traduce 1:1 a un fragmento SET, sin lógica
 *  de negocio propia más allá de "¿vino en el payload?".
 */
export async function buildUserUpdateFields(
  updates: z.infer<typeof userUpdateSchema>['data']
): Promise<{ fields: string[]; values: (string | number | boolean)[] }> {
  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];
  if (updates.fullName) {
    fields.push('full_name = ?');
    values.push(updates.fullName);
  }
  if (updates.department) {
    fields.push('department = ?');
    values.push(updates.department);
  }
  if (updates.email) {
    fields.push('email = ?');
    values.push(EncryptionService.encrypt(updates.email));
  }
  if (updates.password) {
    fields.push('password_hash = ?');
    values.push(await argon2Hash(updates.password));
  }
  if (updates.roleId !== undefined) {
    fields.push('role_id = ?');
    values.push(updates.roleId);
  }
  if (updates.profilePictureUrl) {
    fields.push('profile_picture_url = ?');
    values.push(updates.profilePictureUrl);
  }
  if (updates.employeeNumber) {
    fields.push('employee_number = ?');
    values.push(updates.employeeNumber);
  }
  if (updates.departmentId) {
    fields.push('department_id = ?');
    values.push(updates.departmentId);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }
  return { fields, values };
}

/** FC 082 F3c Cond.1 (Bravo) — R4: "role_id=0 solo Ω". roles solo conserva la
 *  fila 0 (GrayMan) desde la purga de mig.164 (F0c) — cualquier otro valor ya
 *  no tiene contraparte real y violaría la FK legacy; se rechaza explícito en
 *  vez de dejar que un error crudo de MySQL llegue al cliente. "Ω" se checa
 *  igual que en cosmonautMiddleware (roleId=0 O permissions incluye '*'), no
 *  solo el claim roleId — mismo criterio que requireOmega(). Retorna null si
 *  el update es válido (o no toca roleId), o el shape de error a responder.
 */
export function validateRoleIdUpdate(
  roleId: number | undefined,
  adminIsOmega: boolean
): { status: number; code: string; message: string } | null {
  if (roleId === undefined) return null;
  if (roleId !== 0) {
    return {
      status: 400,
      code: 'ROLE_ID_UNSUPPORTED',
      message:
        'roleId legacy solo admite 0 (GrayMan) — la asignación de roles reales usa POST /cosmonauts/:userId/roles',
    };
  }
  if (!adminIsOmega) {
    return { status: 403, code: 'FORBIDDEN', message: 'Solo Ω puede asignar role_id=0' };
  }
  return null;
}

/** FC 082 F3c Cond.1 (Bravo) — R4: refleja roleId=0 en el chasis cosmonauta
 *  (cosmonaut_role_assignments) en vez de user_roles legacy. I8 se invoca
 *  explícito por consistencia con POST /cosmonauts/:userId/roles, aunque para
 *  un caller Ω siempre pase (bypass '*' documentado en antiEscalationGuard).
 *  Retorna false si I8 deniega el grant (caller debe hacer rollback + 403).
 */
export async function syncGrayManCosmonautAssignment(
  connection: PoolConnection,
  targetUserId: string,
  adminId: number
): Promise<boolean> {
  const grayManRoleId = await UserRepository.findGrayManCosmonautRoleId(connection);
  if (grayManRoleId === null) return true;
  const allowed = await antiEscalationGuard(adminId, null, grayManRoleId);
  if (!allowed) return false;
  await UserRepository.revokeGlobalCosmonautAssignments(targetUserId, adminId, connection);
  await UserRepository.insertGrayManCosmonautAssignmentIfAbsent(
    targetUserId,
    grayManRoleId,
    adminId,
    connection
  );
  return true;
}

// FC 082 F0c — /register y sus helpers (resolveOwnerRow, insertOwnerProfile)
// murieron con las bandas de roles {1,3,4} (084_AN v3.1 §1a). El alta de
// usuarios/Arcs renace en F3 sobre el chasis §24.13 + Contrato §C (dual-door).

export type UpdateUserResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/** FC 082 F3c Cond.1 (Bravo) — R4: ya NO se escribe user_roles (legacy); se refleja
 *  en el chasis cosmonauta. Retorna el error a devolver (con rollback+release ya
 *  aplicados) si I8 deniega el grant, o null si no aplica / fue concedido.
 */
async function syncRoleIdIfRequested(
  connection: PoolConnection,
  id: string,
  roleId: number | undefined,
  adminId: number
): Promise<UpdateUserResult | null> {
  if (roleId !== 0) return null;
  const synced = await syncGrayManCosmonautAssignment(connection, id, adminId);
  if (synced) return null;
  await connection.rollback();
  connection.release();
  return {
    ok: false,
    status: 403,
    code: 'PRIVILEGE_ESCALATION',
    message: 'Privilege escalation denied',
  };
}

/** PATCH /users/:id — full transaction: lock, scope-guard, build+apply SET, GrayMan sync, audit. */
export async function updateUser(
  id: string,
  updates: z.infer<typeof userUpdateSchema>['data'],
  reason: string,
  admin: { id: number; permissions?: string[] }
): Promise<UpdateUserResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const snapshotBefore = await UserRepository.findUserForUpdateById(id, connection);
    if (!snapshotBefore) {
      connection.release();
      return { ok: false, status: 404, code: 'U3', message: 'U3' };
    }

    const ownerScope = await resolveOwnerScope(admin);
    if (ownerScope !== null && !(await isUserInOwnerScope(connection, id, ownerScope))) {
      connection.release();
      return { ok: false, status: 403, code: 'FORBIDDEN', message: 'User outside owner scope' };
    }

    const { fields, values } = await buildUserUpdateFields(updates);
    if (fields.length > 0) {
      await UserRepository.updateUserFields(id, fields.join(', '), values, connection);
    }

    const roleSyncError = await syncRoleIdIfRequested(connection, id, updates.roleId, admin.id);
    if (roleSyncError) return roleSyncError;

    const snapshotAfter = await UserRepository.findUserById(id, connection);
    await recordAuditLog({
      entity_type: 'user',
      entity_id: String(id),
      action: 'UPDATE',
      snapshot_before: snapshotBefore,
      snapshot_after: snapshotAfter ?? undefined,
      reason,
      user_id: admin.id,
    });

    await connection.commit();
    connection.release();
    return { ok: true };
  } catch (e) {
    await connection.rollback();
    connection.release();
    throw e;
  }
}

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/** DELETE /users/:id — lock, scope-guard, delete, audit. */
export async function deleteUser(
  id: string,
  reason: string,
  admin: { id: number; permissions?: string[] }
): Promise<DeleteUserResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const snapshotBefore = await UserRepository.findUserForUpdateById(id, connection);
    if (!snapshotBefore) {
      connection.release();
      return { ok: false, status: 404, code: 'D3', message: 'D3' };
    }

    const ownerScope = await resolveOwnerScope(admin);
    if (ownerScope !== null && !(await isUserInOwnerScope(connection, id, ownerScope))) {
      connection.release();
      return { ok: false, status: 403, code: 'FORBIDDEN', message: 'User outside owner scope' };
    }

    await UserRepository.deleteUserById(id, connection);
    await recordAuditLog({
      entity_type: 'user',
      entity_id: String(id),
      action: 'DELETE',
      snapshot_before: snapshotBefore,
      reason,
      user_id: admin.id,
    });

    await connection.commit();
    connection.release();
    return { ok: true };
  } catch (e) {
    await connection.rollback();
    connection.release();
    throw e;
  }
}

export type UpdateUserOwnersResult =
  | { ok: true; ownerIds: number[] }
  | { ok: false; status: number; code: string; message: string; field?: string };

/** Both-direction BOLA check: target's current owners AND every requested owner must be in scope. */
async function validateOwnerScopeForUpdate(
  connection: PoolConnection,
  id: string,
  ownerIds: number[],
  ownerScope: number[] | null
): Promise<UpdateUserOwnersResult | null> {
  if (ownerScope === null) return null;
  const targetOwnerIds = await UserRepository.findOwnerMembershipIdsByUserId(id, connection);
  const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
  if (targetOwnerIds.length > 0 && !hasOverlap) {
    return { ok: false, status: 403, code: 'FORBIDDEN', message: 'User outside owner scope' };
  }
  const allInScope = ownerIds.every((oid) => ownerScope.includes(oid));
  if (!allInScope) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Cannot assign owner outside of scope',
    };
  }
  return null;
}

/** Validates every requested ownerId actually exists in `owners` before replacing the set. */
async function validateOwnerIdsExist(
  connection: PoolConnection,
  ownerIds: number[]
): Promise<UpdateUserOwnersResult | null> {
  if (ownerIds.length === 0) return null;
  const existingIds = await UserRepository.findExistingOwnerIds(ownerIds, connection);
  if (existingIds.length === ownerIds.length) return null;
  return {
    ok: false,
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Propietario inválido: no existe en la tabla de propietarios',
    field: 'ownerIds',
  };
}

/** PUT /users/:id/owners — full transaction: lock, scope-guard both directions, replace, audit. */
export async function updateUserOwners(
  id: string,
  ownerIds: number[],
  reason: string,
  admin: { id: number; permissions?: string[] }
): Promise<UpdateUserOwnersResult> {
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const userExists = await UserRepository.existsUserForUpdate(id, connection);
      if (!userExists) {
        await connection.rollback();
        return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Usuario no encontrado' };
      }

      const ownerScope = await resolveOwnerScope(admin);
      const scopeError = await validateOwnerScopeForUpdate(connection, id, ownerIds, ownerScope);
      if (scopeError) {
        await connection.rollback();
        return scopeError;
      }

      const idsError = await validateOwnerIdsExist(connection, ownerIds);
      if (idsError) {
        await connection.rollback();
        return idsError;
      }

      const beforeOwnerIds = await UserRepository.findOwnerMembershipIdsByUserId(id, connection);
      await UserRepository.deleteOwnerMembershipsByUserId(id, connection);
      if (ownerIds.length > 0) {
        await UserRepository.insertOwnerMemberships(id, ownerIds, connection);
      }

      await recordAuditLog({
        entity_type: 'user',
        entity_id: String(id),
        action: 'UPDATE',
        snapshot_before: { ownerIds: beforeOwnerIds },
        snapshot_after: { ownerIds },
        reason,
        user_id: admin.id,
      });

      await connection.commit();
      return { ok: true, ownerIds };
    } catch (e) {
      await connection.rollback();
      throw e;
    }
  });
}
