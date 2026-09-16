import { hash as argon2Hash } from '@node-rs/argon2';
import db from './db';
import * as CosmologyRepository from './cosmology.repository';
import * as PublicSignupRepository from './publicSignup.repository';
import EncryptionService from './encryption';
import { findUserByEmail } from './authSession.service';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form (Cond.R-177 R1/R2/R3, Bravo 312_AN). The one and
 * only way a user can exist without Ω creating them. Nothing here writes to `tenant_user_memberships`;
 * there is nothing for a caller to escalate even if the payload tried (the Zod schema at the
 * route layer doesn't accept role/tenant fields in the first place).
 *
 * FC182 (Modelo B, §24.15 Arconautas Itinerantes) — the user is born `is_active: true` with the
 * global `Arc` role assigned atomically in the same transaction: Arcsial/perfil/notificaciones
 * access from minute one, zero tenant, zero admin/finance/fleet capability (`cosmonaut_roles`
 * seed, migración 170). Promotion to `MU` over a Universo stays 100% Ω-exclusive (FC177 F3).
 */

export interface PublicSignupInput {
  fullName: string;
  email: string;
  password: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostalFiscal: string;
  usoCfdi: string;
  telefono?: string;
}

export type PublicSignupResult =
  | { ok: true; userId: number }
  | { ok: false; status: number; code: string; message: string };

/** Cond.R-177 R3 (Bravo) — anti-enumeration: email and username collisions return the exact
 *  same generic conflict, never revealing which one matched an existing account. */
function conflictResult(): PublicSignupResult {
  return {
    ok: false,
    status: 409,
    code: 'SIGNUP_CONFLICT',
    message: 'No se pudo completar el registro con los datos proporcionados',
  };
}

async function isDuplicate(email: string): Promise<boolean> {
  if (await findUserByEmail(email)) return true;
  return CosmologyRepository.usernameExists(email);
}

/** The atomic TX: `users` (is_active=true) + `user_billing_profiles` + the global `Arc` role
 *  assignment, same connection — never leave an orphaned user row without its fiscal snapshot
 *  or its Arc identity, or vice versa. `arcRoleId` is resolved by the caller (fail-closed,
 *  before this ever opens) so a missing seed can't leave a half-formed itinerant. */
async function runSignupTransaction(
  input: PublicSignupInput,
  passwordHash: string,
  emailEncrypted: string,
  arcRoleId: number
): Promise<number> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = await CosmologyRepository.insertSeedUser(
      input.email,
      input.fullName,
      emailEncrypted,
      passwordHash,
      true,
      connection
    );
    await PublicSignupRepository.insertBillingProfile(
      userId,
      {
        rfc: input.rfc,
        razonSocial: input.razonSocial,
        regimenFiscal: input.regimenFiscal,
        codigoPostalFiscal: input.codigoPostalFiscal,
        usoCfdi: input.usoCfdi,
        telefono: input.telefono,
      },
      connection
    );
    await CosmologyRepository.insertCosmonautRoleAssignment(
      userId,
      arcRoleId,
      null,
      null,
      connection
    );
    await connection.commit();
    return userId;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** Scenario 1 (FC177/FC182 Gherkin) — public, unauthenticated signup into the global `Arc`
 *  identity (Modelo B): active, Arcsial-only, zero tenant. Fail-closed on the role lookup
 *  (Cond.R-182, mirrors `prepareUserLink`'s `MU_ROLE_NOT_CONFIGURED`) — never open the TX if
 *  migración 170's seed hasn't run in this environment. */
export async function publicSignup(input: PublicSignupInput): Promise<PublicSignupResult> {
  const arcRoleId = await CosmologyRepository.findArcCosmonautRoleId();
  if (arcRoleId === null) {
    return {
      ok: false,
      status: 500,
      code: 'ARC_ROLE_NOT_CONFIGURED',
      message: 'Rol Arc no configurado en el chasis cosmonauta (migración 170 pendiente)',
    };
  }
  if (await isDuplicate(input.email)) {
    return conflictResult();
  }
  const passwordHash = await argon2Hash(input.password);
  const emailEncrypted = EncryptionService.encrypt(input.email);
  const userId = await runSignupTransaction(input, passwordHash, emailEncrypted, arcRoleId);
  return { ok: true, userId };
}
