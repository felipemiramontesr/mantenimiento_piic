/**
 * FC177 F1 — Login_Hard_Gate_And_Billing_Schema (Cond.R-177, Bravo 312_AN).
 * Cubre el núcleo testeable `auditIsActiveUsers`: agrupa usuarios por `is_active`,
 * 0 escritura (solo SELECT), lista las cuentas bloqueadas para revisión previa
 * al despliegue del gate duro en `login()`.
 */
import { describe, it, expect } from 'vitest';
import { auditIsActiveUsers, AuditableConnection } from './auditIsActiveUsers';

function makeConn(
  rows: Array<{ id: number; username: string; role_id: number; is_active: number }>
): AuditableConnection {
  return { execute: async () => [rows, undefined] };
}

describe('FC177 F1 · auditIsActiveUsers (núcleo)', () => {
  it('todas las cuentas activas — 0 inactivas listadas', async () => {
    const conn = makeConn([
      { id: 1, username: 'GrayMan', role_id: 0, is_active: 1 },
      { id: 2, username: 'arc', role_id: 2, is_active: 1 },
    ]);
    const result = await auditIsActiveUsers(conn);
    expect(result).toEqual({ total: 2, active: 2, inactive: [] });
  });

  it('cuentas is_active=0 preexistentes se listan completas para revisión', async () => {
    const inactiveRow = { id: 3, username: 'legacy_off', role_id: 1, is_active: 0 };
    const conn = makeConn([{ id: 1, username: 'GrayMan', role_id: 0, is_active: 1 }, inactiveRow]);
    const result = await auditIsActiveUsers(conn);
    expect(result.total).toBe(2);
    expect(result.active).toBe(1);
    expect(result.inactive).toEqual([inactiveRow]);
  });

  it('0 usuarios — no falla, totales en 0', async () => {
    const result = await auditIsActiveUsers(makeConn([]));
    expect(result).toEqual({ total: 0, active: 0, inactive: [] });
  });
});
