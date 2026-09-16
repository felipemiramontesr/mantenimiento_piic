import { PoolConnection } from 'mysql2/promise';
import {
  findMuCosmonautRoleId,
  insertTenantUserMembership,
  insertCosmonautRoleAssignment,
} from './cosmology.repository';
import * as LinkingRepository from './universeUserLinking.repository';
import * as CosmonautRepository from './cosmonaut.repository';
import { designateMasterOfUniverse } from './universeBootstrap';

/**
 * FC177 F3 — Cosmology_Universe_User_Linking_Backend. Supersedes FC176 F2's
 * `universeAdminSeed.ts` (which CREATED a brand-new admin user inline) — Cond.R-177 R3 (Bravo)
 * explicitly retires that flow: Cosmología no longer captures anyone's data by hand. GrayMan
 * instead links an EXISTING, self-registered user to the Universo he's creating; this module is
 * the fail-closed pre-checks + the atomic-TX tail (activate → membership → MU role →
 * `designateMasterOfUniverse`) for that link.
 *
 * FC182 (Modelo B, 331_AN Alfa / 332_AN Bravo) — the candidate arrives already active (global
 * `Arc` role, Arcsial-only, no tenant) rather than quarantined; `is_active` now only signals
 * admin suspension, so `validateLinkCandidate` fails closed on `!isActive` (suspended, not
 * eligible) instead of the old `isActive` (already active, not pending) — same fail-closed
 * posture, redefined for the new lifecycle.
 */

export type LinkUserError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type PreparedUserLink = {
  userId: number;
  muRoleId: number;
  billing: {
    rfc: string;
    razonSocial: string;
    regimenFiscal: string;
    usoCfdi: string;
    telefono: string | null;
  };
};

type BillingProfile = NonNullable<Awaited<ReturnType<typeof LinkingRepository.findBillingProfile>>>;

/** The 4 fail-closed candidate checks (Cond.R-177 R3, Bravo), extracted so `prepareUserLink`
 *  stays under Gate 2's budget: doesn't exist, already active, already belongs to a tenant, or
 *  never completed public signup (no billing snapshot). */
async function validateLinkCandidate(userId: number): Promise<BillingProfile | LinkUserError> {
  const user = await LinkingRepository.findUserActiveState(userId);
  if (!user) {
    return {
      ok: false,
      status: 404,
      code: 'LINKED_USER_NOT_FOUND',
      message: 'Usuario no encontrado',
    };
  }
  if (!user.isActive) {
    return {
      ok: false,
      status: 409,
      code: 'LINKED_USER_INACTIVE',
      message: 'El usuario está desactivado o suspendido — no elegible para vinculación',
    };
  }
  const memberships = await CosmonautRepository.findTenantMembershipOwnerIds(userId);
  if (memberships.length > 0) {
    return {
      ok: false,
      status: 409,
      code: 'LINKED_USER_ALREADY_MEMBER',
      message: 'El usuario ya pertenece a un Universo',
    };
  }
  const billing = await LinkingRepository.findBillingProfile(userId);
  if (!billing) {
    return {
      ok: false,
      status: 409,
      code: 'LINKED_USER_MISSING_BILLING_PROFILE',
      message: 'El usuario no completó su registro fiscal',
    };
  }
  return billing;
}

/** Cond.R-177 R3 (Bravo) — fail-closed if the target isn't a valid linking candidate. Mirrors
 *  FC176 F2's `prepareInitialAdminSeed` shape, different checks (`validateLinkCandidate`). */
export async function prepareUserLink(userId: number): Promise<PreparedUserLink | LinkUserError> {
  const muRoleId = await findMuCosmonautRoleId();
  if (muRoleId === null) {
    return {
      ok: false,
      status: 500,
      code: 'MU_ROLE_NOT_CONFIGURED',
      message: 'Rol MU no configurado en el chasis cosmonauta (migración 170 pendiente)',
    };
  }
  const billing = await validateLinkCandidate(userId);
  if (!('rfc' in billing)) return billing;
  return {
    userId,
    muRoleId,
    billing: {
      rfc: billing.rfc,
      razonSocial: billing.razon_social,
      regimenFiscal: billing.regimen_fiscal,
      usoCfdi: billing.uso_cfdi,
      telefono: billing.telefono,
    },
  };
}

/** F3-I3 — the atomic-TX tail: migrate the fiscal snapshot → activate → membership → MU role →
 *  `designateMasterOfUniverse`. Same non-'MU_DESIGNATED' fail-closed throw as FC176 F2's
 *  `seedInitialAdminInTx` — I1 |MU(U)| = 1 must hold or nothing commits. */
export async function linkUserInTx(
  connection: PoolConnection,
  tenantId: number,
  callerId: number,
  link: PreparedUserLink
): Promise<void> {
  await LinkingRepository.insertTenantProfileFromBilling(tenantId, link.billing, connection);
  await LinkingRepository.activateUser(link.userId, connection);
  await insertTenantUserMembership(link.userId, tenantId, connection);
  await insertCosmonautRoleAssignment(link.userId, link.muRoleId, tenantId, callerId, connection);
  const designation = await designateMasterOfUniverse(connection, {
    tenantId,
    userId: link.userId,
  });
  if (designation !== 'MU_DESIGNATED') {
    throw new Error(`FC177 F3: designateMasterOfUniverse → ${designation} (esquema pre-154)`);
  }
}
