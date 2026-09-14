import { hash as argon2Hash } from '@node-rs/argon2';
import db from './db';
import * as CosmologyRepository from './cosmology.repository';
import * as PublicSignupRepository from './publicSignup.repository';
import EncryptionService from './encryption';
import { findUserByEmail } from './authSession.service';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form (Cond.R-177 R1/R2/R3, Bravo 312_AN). The one and
 * only way a user can exist without Ω creating them — and, by construction, the one and only
 * way a user can exist with ZERO capability: `is_active: false`, no `tenant_user_memberships`
 * row, no `cosmonaut_role_assignments` row. Nothing here writes to either table; there is
 * nothing for a caller to escalate even if the payload tried (the Zod schema at the route layer
 * doesn't accept role/tenant fields in the first place).
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

/** The atomic TX: `users` (is_active=false) + `user_billing_profiles`, same connection —
 *  never leave an orphaned user row without its fiscal snapshot, or vice versa. */
async function runSignupTransaction(
  input: PublicSignupInput,
  passwordHash: string,
  emailEncrypted: string
): Promise<number> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = await CosmologyRepository.insertSeedUser(
      input.email,
      input.fullName,
      emailEncrypted,
      passwordHash,
      false,
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
    await connection.commit();
    return userId;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** Scenario 1 (FC177 Gherkin) — public, unauthenticated signup into quarantine. */
export async function publicSignup(input: PublicSignupInput): Promise<PublicSignupResult> {
  if (await isDuplicate(input.email)) {
    return conflictResult();
  }
  const passwordHash = await argon2Hash(input.password);
  const emailEncrypted = EncryptionService.encrypt(input.email);
  const userId = await runSignupTransaction(input, passwordHash, emailEncrypted);
  return { ok: true, userId };
}
