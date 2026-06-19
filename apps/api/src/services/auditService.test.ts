/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeSnapshot, recordAuditLog } from './auditService';
import db from './db';

vi.mock('./db', () => ({
  default: { query: vi.fn() },
}));

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

/**
 * auditService — Archon_Security_AuditLog Fase 1
 *
 * AS-1: sanitizeSnapshot redacta campos sensibles
 * AS-2: sanitizeSnapshot preserva campos seguros
 * AS-3: sanitizeSnapshot retorna undefined si input undefined
 * AS-4: recordAuditLog inserta con owner_id cuando se provee
 * AS-5: recordAuditLog inserta con owner_id=NULL si no se provee (backwards compat)
 * AS-6: recordAuditLog aplica sanitizeSnapshot antes del INSERT
 */

describe('sanitizeSnapshot', () => {
  it('AS-1: redacta campos sensibles', () => {
    const input = {
      password_hash: 'abc123',
      placas: 'XYZ-123',
      numeroSerie: 'SN001',
      email: 'user@test.com',
    };
    const result = sanitizeSnapshot(input);
    expect(result.password_hash).toBe('[REDACTED]');
    expect(result.placas).toBe('[REDACTED]');
    expect(result.numeroSerie).toBe('[REDACTED]');
    expect(result.email).toBe('user@test.com'); // email is NOT in the sanitized list
  });

  it('AS-2: preserva campos seguros intactos', () => {
    const input = { full_name: 'Felipe', rfc: 'MIRF800101', action: 'UPDATE' };
    const result = sanitizeSnapshot(input);
    expect(result).toEqual(input);
  });

  it('AS-3: retorna undefined si el input es undefined', () => {
    expect(sanitizeSnapshot(undefined)).toBeUndefined();
  });
});

describe('recordAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query).mockResolvedValue([{ affectedRows: 1 }]);
  });

  it('AS-4: inserta con owner_id cuando se provee', async () => {
    await recordAuditLog({
      entity_type: 'user',
      entity_id: '42',
      action: 'UPDATE',
      reason: 'Profile update',
      user_id: 1,
      owner_id: 5,
    });

    expect(db.query).toHaveBeenCalledOnce();
    const [, params] = vi.mocked(db.query).mock.calls[0];
    expect(params[8]).toBe(5); // owner_id is 9th param (index 8)
  });

  it('AS-5: inserta con owner_id=NULL si no se provee (backwards compat)', async () => {
    await recordAuditLog({
      entity_type: 'fleet_unit',
      entity_id: '99',
      action: 'CREATE',
      reason: 'Unit added',
      user_id: 2,
    });

    expect(db.query).toHaveBeenCalledOnce();
    const [, params] = vi.mocked(db.query).mock.calls[0];
    expect(params[8]).toBeNull(); // owner_id=NULL
  });

  it('AS-6: aplica sanitizeSnapshot antes del INSERT', async () => {
    await recordAuditLog({
      entity_type: 'user',
      entity_id: '7',
      action: 'UPDATE',
      reason: 'Password change',
      user_id: 1,
      owner_id: 3,
      snapshot_before: { password_hash: 'old_hash', full_name: 'Ana' },
      snapshot_after: { password_hash: 'new_hash', full_name: 'Ana' },
    });

    const [, params] = vi.mocked(db.query).mock.calls[0];
    const snapshotBefore = JSON.parse(params[4]);
    const snapshotAfter = JSON.parse(params[5]);
    expect(snapshotBefore.password_hash).toBe('[REDACTED]');
    expect(snapshotAfter.password_hash).toBe('[REDACTED]');
    expect(snapshotBefore.full_name).toBe('Ana');
  });
});
