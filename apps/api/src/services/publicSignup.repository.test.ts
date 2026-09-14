/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { insertBillingProfile } from './publicSignup.repository';

/** FC177 F2 — same direct-executor pattern as `cosmology.repository.test.ts` (FC162 F1-T5). */

const mockExecutor = { execute: vi.fn() } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('insertBillingProfile', () => {
  it('inserts the 7-column fiscal snapshot bound to user_id', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertBillingProfile(
      501,
      {
        rfc: 'XAXX010101000',
        razonSocial: 'Cliente Ejemplo SA de CV',
        regimenFiscal: '601',
        codigoPostalFiscal: '06600',
        usoCfdi: 'G03',
        telefono: '5551234567',
      },
      mockExecutor
    );
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_billing_profiles'),
      [501, 'XAXX010101000', 'Cliente Ejemplo SA de CV', '601', '06600', 'G03', '5551234567']
    );
  });

  it('telefono ausente se persiste como NULL, no undefined', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertBillingProfile(
      502,
      {
        rfc: 'XAXX010101000',
        razonSocial: 'Cliente Sin Telefono',
        regimenFiscal: '612',
        codigoPostalFiscal: '01000',
        usoCfdi: 'S01',
      },
      mockExecutor
    );
    const [, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(params[6]).toBeNull();
  });
});
