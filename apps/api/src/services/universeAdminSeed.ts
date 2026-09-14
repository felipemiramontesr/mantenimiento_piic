import { PoolConnection } from 'mysql2/promise';
import { hash as argon2Hash } from '@node-rs/argon2';
import * as CosmologyRepository from './cosmology.repository';
import EncryptionService from './encryption';
import { findUserByEmail } from './authSession.service';
import { designateMasterOfUniverse } from './universeBootstrap';

/**
 * FC176 F2 — Cosmology_Universe_Seed_Admin_Endpoint. Split out of `cosmology.service.ts`
 * (which was at the 400-line ESLint `max-lines` ceiling) — same relationship as
 * `universeBootstrap.ts`: a small, focused module `cosmology.service.ts` calls into for one
 * slice of Universe-creation logic (here, seeding the Universo's first admin user).
 */

export interface InitialAdminInput {
  fullName: string;
  email: string;
  password: string;
}

export type PreparedAdminSeed = {
  muRoleId: number;
  username: string;
  fullName: string;
  emailEncrypted: string;
  passwordHash: string;
};

export type PrepareAdminSeedError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

/** FC176 F2 fail-closed guard (Cond.R-176 R1 Bravo): resolves the R_global 'MU' role, checks
 *  for a duplicate email (same decrypt-and-compare mechanism `login()` uses as its fallback)
 *  and username, then hashes/encrypts — all BEFORE opening the seed transaction. Username =
 *  email (login already accepts either, `authSession.service.ts`'s `findUserByEmail` fallback). */
export async function prepareInitialAdminSeed(
  initialAdmin: InitialAdminInput
): Promise<PreparedAdminSeed | PrepareAdminSeedError> {
  const muRoleId = await CosmologyRepository.findMuCosmonautRoleId();
  if (muRoleId === null) {
    return {
      ok: false,
      status: 500,
      code: 'MU_ROLE_NOT_CONFIGURED',
      message: 'Rol MU no configurado en el chasis cosmonauta (migración 170 pendiente)',
    };
  }
  if (await findUserByEmail(initialAdmin.email)) {
    return { ok: false, status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'Email ya registrado' };
  }
  if (await CosmologyRepository.usernameExists(initialAdmin.email)) {
    return {
      ok: false,
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
      message: 'Username ya registrado',
    };
  }
  const passwordHash = await argon2Hash(initialAdmin.password);
  return {
    muRoleId,
    username: initialAdmin.email,
    fullName: initialAdmin.fullName,
    emailEncrypted: EncryptionService.encrypt(initialAdmin.email),
    passwordHash,
  };
}

/** F2-I6 — the 3 seed-admin INSERTs + MU designation, all within the caller's TX connection
 *  (Cond.R-176 "MISMA TX que tenant"). Non-'MU_DESIGNATED' throws to roll back the whole TX —
 *  a Universo is never left half-seeded (I1 |MU(U)| = 1 must hold or nothing commits). */
export async function seedInitialAdminInTx(
  connection: PoolConnection,
  tenantId: number,
  callerId: number,
  adminSeed: PreparedAdminSeed
): Promise<void> {
  const userId = await CosmologyRepository.insertSeedUser(
    adminSeed.username,
    adminSeed.fullName,
    adminSeed.emailEncrypted,
    adminSeed.passwordHash,
    connection
  );
  await CosmologyRepository.insertTenantUserMembership(userId, tenantId, connection);
  await CosmologyRepository.insertCosmonautRoleAssignment(
    userId,
    adminSeed.muRoleId,
    tenantId,
    callerId,
    connection
  );
  const designation = await designateMasterOfUniverse(connection, { tenantId, userId });
  if (designation !== 'MU_DESIGNATED') {
    throw new Error(`FC176 F2: designateMasterOfUniverse → ${designation} (esquema pre-154)`);
  }
}
