/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  findPendingUsers,
  findBillingProfile,
  findUserActiveState,
  activateUser,
  insertTenantProfileFromBilling,
} from './universeUserLinking.repository';

/**
 * FC177 F3 — Cosmology_Universe_User_Linking_Backend. Same direct-executor pattern as
 * `cosmology.repository.test.ts` (FC162 F1-T5) — no `vi.mock('./db')`.
 */

const mockExecutor = { execute: vi.fn() } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findPendingUsers', () => {
  it('returns quarantined candidates with a billing snapshot and no tenant', async () => {
    const row = {
      id: 501,
      username: 'cliente@ejemplo.mx',
      full_name: 'Cliente Ejemplo',
      email: 'enc_cliente@ejemplo.mx',
      rfc: 'ABC010101AB9',
      razon_social: 'Cliente Ejemplo SA de CV',
    };
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[row], []]);
    const rows = await findPendingUsers(mockExecutor);
    expect(rows).toEqual([row]);
    const [sql] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('is_active = 0');
    expect(sql).toContain('NOT EXISTS');
  });
});

describe('findBillingProfile', () => {
  it('returns the fiscal snapshot for user_id', async () => {
    const row = {
      rfc: 'ABC010101AB9',
      razon_social: 'Cliente Ejemplo SA de CV',
      regimen_fiscal: '601',
      uso_cfdi: 'G03',
      telefono: '5551234567',
    };
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[row], []]);
    expect(await findBillingProfile(501, mockExecutor)).toEqual(row);
    expect(mockExecutor.execute).toHaveBeenCalledWith(expect.any(String), [501]);
  });

  it('returns null when the user never completed signup fiscal data', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findBillingProfile(999, mockExecutor)).toBeNull();
  });
});

describe('findUserActiveState', () => {
  it('maps is_active to a boolean', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ is_active: 0 }], []]);
    expect(await findUserActiveState(501, mockExecutor)).toEqual({ isActive: false });
  });

  it("returns null when the user doesn't exist", async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findUserActiveState(999, mockExecutor)).toBeNull();
  });
});

describe('activateUser', () => {
  it('flips is_active to 1 for userId', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await activateUser(501, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET is_active = 1'),
      [501]
    );
  });
});

describe('insertTenantProfileFromBilling', () => {
  it('migrates rfc/razon_social/regimen_fiscal/uso_cfdi/telefono, NOT codigo_postal_fiscal', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertTenantProfileFromBilling(
      900,
      {
        rfc: 'ABC010101AB9',
        razonSocial: 'Cliente Ejemplo SA de CV',
        regimenFiscal: '601',
        usoCfdi: 'G03',
        telefono: '5551234567',
      },
      mockExecutor
    );
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_profiles'),
      [900, 'ABC010101AB9', 'Cliente Ejemplo SA de CV', '601', 'G03', '5551234567']
    );
  });
});
