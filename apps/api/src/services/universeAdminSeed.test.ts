import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import { hash as argon2Hash } from '@node-rs/argon2';
import * as CosmologyRepository from './cosmology.repository';
import { findUserByEmail } from './authSession.service';
import { designateMasterOfUniverse } from './universeBootstrap';
import {
  prepareInitialAdminSeed,
  seedInitialAdminInTx,
  PreparedAdminSeed,
} from './universeAdminSeed';

/**
 * FC176 F2 — Cosmology_Universe_Seed_Admin_Endpoint. Unit-tests `universeAdminSeed.ts` in
 * isolation (every collaborator mocked at module boundary) — the atomic-TX/HTTP-shape
 * integration coverage lives in `routes/cosmology.test.ts`'s COSMOLOGY-CREATE-SEED-* cases.
 */

vi.mock('./cosmology.repository', () => ({
  findMuCosmonautRoleId: vi.fn(),
  usernameExists: vi.fn(),
  insertSeedUser: vi.fn(),
  insertTenantUserMembership: vi.fn(),
  insertCosmonautRoleAssignment: vi.fn(),
}));
vi.mock('./authSession.service', () => ({ findUserByEmail: vi.fn() }));
vi.mock('./universeBootstrap', () => ({ designateMasterOfUniverse: vi.fn() }));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn() }));
vi.mock('./encryption', () => ({ default: { encrypt: vi.fn((v: string) => `enc_${v}`) } }));

const INITIAL_ADMIN = { fullName: 'MU Seed', email: 'mu@piic.mx', password: 'PasswordTemporal123' };

describe('FC176 F2 — prepareInitialAdminSeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fail-closed (Cond.R-176 R1 Bravo): MU role absent → MU_ROLE_NOT_CONFIGURED, no further checks run', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(null);
    const result = await prepareInitialAdminSeed(INITIAL_ADMIN);
    expect(result).toEqual({
      ok: false,
      status: 500,
      code: 'MU_ROLE_NOT_CONFIGURED',
      message: expect.any(String),
    });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });

  it('duplicate email (decrypt-and-compare, same mechanism as login()) → 409 EMAIL_ALREADY_EXISTS', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (findUserByEmail as Mock).mockResolvedValue({ id: 5 });
    const result = await prepareInitialAdminSeed(INITIAL_ADMIN);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: expect.any(String),
    });
    expect(CosmologyRepository.usernameExists).not.toHaveBeenCalled();
  });

  it('duplicate username (=email) held by an unrelated row → 409 USERNAME_ALREADY_EXISTS', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (findUserByEmail as Mock).mockResolvedValue(null);
    (CosmologyRepository.usernameExists as Mock).mockResolvedValue(true);
    const result = await prepareInitialAdminSeed(INITIAL_ADMIN);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'USERNAME_ALREADY_EXISTS',
      message: expect.any(String),
    });
  });

  it('happy path: hashes password (argon2), encrypts email (AES), sets username = email', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (findUserByEmail as Mock).mockResolvedValue(null);
    (CosmologyRepository.usernameExists as Mock).mockResolvedValue(false);
    (argon2Hash as Mock).mockResolvedValue('hashed_pw');
    const result = await prepareInitialAdminSeed(INITIAL_ADMIN);
    expect(result).toEqual({
      muRoleId: 9,
      username: 'mu@piic.mx',
      fullName: 'MU Seed',
      emailEncrypted: 'enc_mu@piic.mx',
      passwordHash: 'hashed_pw',
    });
    expect(argon2Hash).toHaveBeenCalledWith('PasswordTemporal123');
  });
});

describe('FC176 F2 — seedInitialAdminInTx', () => {
  const conn = {} as unknown as PoolConnection;
  const adminSeed: PreparedAdminSeed = {
    muRoleId: 9,
    username: 'mu@piic.mx',
    fullName: 'MU Seed',
    emailEncrypted: 'enc_mu@piic.mx',
    passwordHash: 'hashed_pw',
  };

  beforeEach(() => vi.clearAllMocks());

  it('inserts user → membership → role assignment → designates MU, all on the same connection', async () => {
    (CosmologyRepository.insertSeedUser as Mock).mockResolvedValue(501);
    (designateMasterOfUniverse as Mock).mockResolvedValue('MU_DESIGNATED');
    await seedInitialAdminInTx(conn, 900, 1, adminSeed);
    expect(CosmologyRepository.insertSeedUser).toHaveBeenCalledWith(
      'mu@piic.mx',
      'MU Seed',
      'enc_mu@piic.mx',
      'hashed_pw',
      true,
      conn
    );
    expect(CosmologyRepository.insertTenantUserMembership).toHaveBeenCalledWith(501, 900, conn);
    expect(CosmologyRepository.insertCosmonautRoleAssignment).toHaveBeenCalledWith(
      501,
      9,
      900,
      1,
      conn
    );
    expect(designateMasterOfUniverse).toHaveBeenCalledWith(conn, { tenantId: 900, userId: 501 });
  });

  it('I1 fail-closed: throws when designateMasterOfUniverse does not return MU_DESIGNATED', async () => {
    (CosmologyRepository.insertSeedUser as Mock).mockResolvedValue(501);
    (designateMasterOfUniverse as Mock).mockResolvedValue('SCHEMA_PRE_154');
    await expect(seedInitialAdminInTx(conn, 900, 1, adminSeed)).rejects.toThrow(/SCHEMA_PRE_154/);
  });
});
