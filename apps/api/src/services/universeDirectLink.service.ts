import db from './db';
import {
  findArcCosmonautRoleId,
  findMuCosmonautRoleId,
  insertCosmonautRoleAssignment,
} from './cosmology.repository';
import { designateMasterOfUniverse, MuAlreadyDesignatedError } from './universeBootstrap';
import { validateLinkCandidate, LinkUserError } from './universeUserLinking';
import * as MembershipRepository from './universeMembership.repository';
import type { CosmonautType } from './universeMembership.repository';
import { recordAuditLog } from './auditService';

/**
 * FC206 F1 — Ω links an EXISTING itinerant user to an EXISTING Universo (QA E3). T1 of the FC, in
 * guard order: the 4 candidate gates of `validateLinkCandidate` (404 / 409 inactive / 409 member /
 * 409 billing) → Universo exists (404) → exact name (400) → MU requested on an anchored Universo
 * (409, never silently downgraded). Then one TX: typed membership + scoped role (`assigned_by` = Ω)
 * + `designateMasterOfUniverse` only for MU. Single-Universe invariant: an existing membership is
 * gate 3, so nobody ends up in two Universos.
 */

export interface DirectLinkRequest {
  readonly userId: number;
  readonly tenantId: number;
  readonly role: CosmonautType;
  readonly confirmUniverseName: string;
  readonly callerId: number;
}

export type DirectLinkResult = { ok: true; role: CosmonautType } | LinkUserError;

const MU_ALREADY_DESIGNATED: LinkUserError = {
  ok: false,
  status: 409,
  code: 'MU_ALREADY_DESIGNATED',
  message: 'El Universo ya tiene un Master of Universe',
};

/** Guards after the candidate gates: Universo exists, exact name, MU only on an empty anchor. */
async function checkTarget(request: DirectLinkRequest): Promise<LinkUserError | null> {
  const tenant = await MembershipRepository.findLinkTargetTenant(request.tenantId);
  if (!tenant) {
    return { ok: false, status: 404, code: 'UNIVERSE_NOT_FOUND', message: 'El Universo no existe' };
  }
  if (request.confirmUniverseName.trim() !== tenant.label) {
    return {
      ok: false,
      status: 400,
      code: 'UNIVERSE_NAME_MISMATCH',
      message: 'El nombre no coincide con el Universo destino',
    };
  }
  return request.role === 'MU' && tenant.hasMu ? MU_ALREADY_DESIGNATED : null;
}

/** Role id for the requested type, from the R_global catalog (null ⇒ seed missing ⇒ 500). */
async function resolveRoleId(role: CosmonautType): Promise<number | null> {
  return role === 'MU' ? findMuCosmonautRoleId() : findArcCosmonautRoleId();
}

/** The atomic tail. A concurrent MU designation (anchor taken mid-flight) rolls back to 409. */
async function linkInTransaction(
  request: DirectLinkRequest,
  roleId: number
): Promise<DirectLinkResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await MembershipRepository.insertTypedMembership(
      request.userId,
      request.tenantId,
      request.role,
      connection
    );
    await insertCosmonautRoleAssignment(
      request.userId,
      roleId,
      request.tenantId,
      request.callerId,
      connection
    );
    if (request.role === 'MU') {
      const designation = await designateMasterOfUniverse(connection, {
        tenantId: request.tenantId,
        userId: request.userId,
      });
      if (designation !== 'MU_DESIGNATED') throw new Error(`FC206 F1: ${designation}`);
    }
    await connection.commit();
    return { ok: true, role: request.role };
  } catch (e) {
    await connection.rollback();
    if (e instanceof MuAlreadyDesignatedError) return MU_ALREADY_DESIGNATED;
    throw e;
  } finally {
    connection.release();
  }
}

/** POST /v1/cosmology/users/:id/link-universe (Ω only — the route carries `requireOmega`). */
export async function linkExistingUserToUniverse(
  request: DirectLinkRequest
): Promise<DirectLinkResult> {
  const candidate = await validateLinkCandidate(request.userId);
  if (!('rfc' in candidate)) return candidate;
  const targetFailure = await checkTarget(request);
  if (targetFailure) return targetFailure;
  const roleId = await resolveRoleId(request.role);
  if (roleId === null) {
    return {
      ok: false,
      status: 500,
      code: 'ROLE_NOT_CONFIGURED',
      message: 'Rol cosmonauta no configurado (migración 170 pendiente)',
    };
  }
  const result = await linkInTransaction(request, roleId);
  if (result.ok) {
    // `administrative_audit_logs.action` es ENUM(CREATE, UPDATE, DELETE): el evento va en reason.
    await recordAuditLog({
      entity_type: 'user',
      entity_id: String(request.userId),
      action: 'CREATE',
      snapshot_after: {
        event: 'LINK_USER_TO_UNIVERSE',
        tenantId: request.tenantId,
        role: request.role,
      },
      reason: `LINK_USER_TO_UNIVERSE — Ω vincula al usuario al Universo ${request.tenantId} como ${request.role} (FC206 F1)`,
      user_id: request.callerId,
      owner_id: request.tenantId,
    });
  }
  return result;
}
