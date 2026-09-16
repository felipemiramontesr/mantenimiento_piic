import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';
import * as CosmologyRepository from './cosmology.repository';
import * as LinkingRepository from './universeUserLinking.repository';
import * as CosmonautRepository from './cosmonaut.repository';
import { designateMasterOfUniverse } from './universeBootstrap';
import { prepareUserLink, linkUserInTx, PreparedUserLink } from './universeUserLinking';

/**
 * FC177 F3 — Cosmology_Universe_User_Linking_Backend. Unit-tests `universeUserLinking.ts` in
 * isolation (every collaborator mocked at module boundary, same pattern as the retired
 * `universeAdminSeed.test.ts`). Route/HTTP-shape integration coverage lives in
 * `routes/cosmology.test.ts`'s COSMOLOGY-LINK and COSMOLOGY-PENDING cases.
 */

vi.mock('./cosmology.repository', () => ({
  findMuCosmonautRoleId: vi.fn(),
  insertTenantUserMembership: vi.fn(),
  insertCosmonautRoleAssignment: vi.fn(),
}));
vi.mock('./universeUserLinking.repository', () => ({
  findUserActiveState: vi.fn(),
  findBillingProfile: vi.fn(),
  insertTenantProfileFromBilling: vi.fn(),
  activateUser: vi.fn(),
}));
vi.mock('./cosmonaut.repository', () => ({ findTenantMembershipOwnerIds: vi.fn() }));
vi.mock('./universeBootstrap', () => ({ designateMasterOfUniverse: vi.fn() }));

const BILLING_ROW = {
  rfc: 'ABC010101AB9',
  razon_social: 'Cliente Ejemplo SA de CV',
  regimen_fiscal: '601',
  uso_cfdi: 'G03',
  telefono: '5551234567',
};

describe('FC177 F3 — prepareUserLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fail-closed (Cond.R-177 R3 Bravo): MU role absent → MU_ROLE_NOT_CONFIGURED, no further checks run', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(null);
    const result = await prepareUserLink(501);
    expect(result).toEqual({
      ok: false,
      status: 500,
      code: 'MU_ROLE_NOT_CONFIGURED',
      message: expect.any(String),
    });
    expect(LinkingRepository.findUserActiveState).not.toHaveBeenCalled();
  });

  it("linkedUserId doesn't exist → 404 LINKED_USER_NOT_FOUND", async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (LinkingRepository.findUserActiveState as Mock).mockResolvedValue(null);
    const result = await prepareUserLink(999);
    expect(result).toEqual({
      ok: false,
      status: 404,
      code: 'LINKED_USER_NOT_FOUND',
      message: expect.any(String),
    });
  });

  it('user inactive/suspended (FC182 — is_active now signals admin suspension, not quarantine) → 409 LINKED_USER_INACTIVE', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (LinkingRepository.findUserActiveState as Mock).mockResolvedValue({ isActive: false });
    const result = await prepareUserLink(501);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'LINKED_USER_INACTIVE',
      message: expect.any(String),
    });
    expect(CosmonautRepository.findTenantMembershipOwnerIds).not.toHaveBeenCalled();
  });

  it('user already belongs to a Universo → 409 LINKED_USER_ALREADY_MEMBER', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (LinkingRepository.findUserActiveState as Mock).mockResolvedValue({ isActive: true });
    (CosmonautRepository.findTenantMembershipOwnerIds as Mock).mockResolvedValue([4]);
    const result = await prepareUserLink(501);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'LINKED_USER_ALREADY_MEMBER',
      message: expect.any(String),
    });
    expect(LinkingRepository.findBillingProfile).not.toHaveBeenCalled();
  });

  it('user never completed signup fiscal data → 409 LINKED_USER_MISSING_BILLING_PROFILE', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (LinkingRepository.findUserActiveState as Mock).mockResolvedValue({ isActive: true });
    (CosmonautRepository.findTenantMembershipOwnerIds as Mock).mockResolvedValue([]);
    (LinkingRepository.findBillingProfile as Mock).mockResolvedValue(null);
    const result = await prepareUserLink(501);
    expect(result).toEqual({
      ok: false,
      status: 409,
      code: 'LINKED_USER_MISSING_BILLING_PROFILE',
      message: expect.any(String),
    });
  });

  it('happy path (FC182): valid active Arc candidate → PreparedUserLink with mapped billing fields', async () => {
    (CosmologyRepository.findMuCosmonautRoleId as Mock).mockResolvedValue(9);
    (LinkingRepository.findUserActiveState as Mock).mockResolvedValue({ isActive: true });
    (CosmonautRepository.findTenantMembershipOwnerIds as Mock).mockResolvedValue([]);
    (LinkingRepository.findBillingProfile as Mock).mockResolvedValue(BILLING_ROW);
    const result = await prepareUserLink(501);
    expect(result).toEqual({
      userId: 501,
      muRoleId: 9,
      billing: {
        rfc: 'ABC010101AB9',
        razonSocial: 'Cliente Ejemplo SA de CV',
        regimenFiscal: '601',
        usoCfdi: 'G03',
        telefono: '5551234567',
      },
    });
  });
});

describe('FC177 F3 — linkUserInTx', () => {
  const conn = {} as unknown as PoolConnection;
  const link: PreparedUserLink = {
    userId: 501,
    muRoleId: 9,
    billing: {
      rfc: 'ABC010101AB9',
      razonSocial: 'Cliente Ejemplo SA de CV',
      regimenFiscal: '601',
      usoCfdi: 'G03',
      telefono: '5551234567',
    },
  };

  beforeEach(() => vi.clearAllMocks());

  it('migrates fiscal data → activates → membership → role → designates MU, all on the same connection', async () => {
    (designateMasterOfUniverse as Mock).mockResolvedValue('MU_DESIGNATED');
    await linkUserInTx(conn, 900, 1, link);
    expect(LinkingRepository.insertTenantProfileFromBilling).toHaveBeenCalledWith(
      900,
      link.billing,
      conn
    );
    expect(LinkingRepository.activateUser).toHaveBeenCalledWith(501, conn);
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
    (designateMasterOfUniverse as Mock).mockResolvedValue('SCHEMA_PRE_154');
    await expect(linkUserInTx(conn, 900, 1, link)).rejects.toThrow(/SCHEMA_PRE_154/);
  });
});
