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

/** Ω's canonical predicate (migration 170): `role_id = 0`, never the username. */
const OMEGA_ROLE_ID = 0;

/** Build a fail-closed rejection. */
function reject(status: number, code: string, message: string): LinkUserError {
  return { ok: false, status, code, message };
}

/** Gate 4 rejection — already in a Universo (single-Universe invariant). */
export const ALREADY_MEMBER_REJECTION = reject(
  409,
  'LINKED_USER_ALREADY_MEMBER',
  'El usuario ya pertenece a un Universo'
);

/** Gate 5 rejection — never completed the public signup's fiscal snapshot. */
export const MISSING_BILLING_REJECTION = reject(
  409,
  'LINKED_USER_MISSING_BILLING_PROFILE',
  'El usuario no completó su registro fiscal'
);

/** FC207 T1 gates 1–3 on the user row: doesn't exist (404), is Ω (403 — checked before
 *  inactivity, so an inactive Ω still gets 403), or is suspended (409). `null` = passes.
 *  FC209 F2 reuses it for Arcsial's UNIVERSE invitations (T1 4b–4c, T2 rows 5–6). */
export function rejectUserRow(
  user: { isActive: boolean; roleId: number } | null
): LinkUserError | null {
  if (!user) return reject(404, 'LINKED_USER_NOT_FOUND', 'Usuario no encontrado');
  if (user.roleId === OMEGA_ROLE_ID) {
    return reject(
      403,
      'CANNOT_LINK_OMEGA_USER',
      'La cuenta soberana Omega no puede vincularse a un Universo'
    );
  }
  if (!user.isActive) {
    return reject(
      409,
      'LINKED_USER_INACTIVE',
      'El usuario está desactivado o suspendido — no elegible para vinculación'
    );
  }
  return null;
}

/** The 5 fail-closed candidate checks in FC207 T1 order (Cond.R-177 R3 + FC207 F2's Ω gate):
 *  doesn't exist, is Ω, suspended, already belongs to a tenant, or never completed public
 *  signup (no billing snapshot). */
export async function validateLinkCandidate(
  userId: number
): Promise<BillingProfile | LinkUserError> {
  const rowRejection = rejectUserRow(await LinkingRepository.findUserActiveState(userId));
  if (rowRejection) return rowRejection;
  const memberships = await CosmonautRepository.findTenantMembershipOwnerIds(userId);
  if (memberships.length > 0) return ALREADY_MEMBER_REJECTION;
  const billing = await LinkingRepository.findBillingProfile(userId);
  return billing ?? MISSING_BILLING_REJECTION;
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
