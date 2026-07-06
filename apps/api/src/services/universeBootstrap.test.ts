import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';

import {
  designateMasterOfUniverse,
  resetBootstrapSchemaCache,
  MuAlreadyDesignatedError,
} from './universeBootstrap';

/**
 * 🔱 FC 062 F6 (enmienda v1.2 — Zero_State_GrayMan_Only · Scenario 8)
 * §24.12: I1 |MU(U)| = 1 · I2 create(MU) ∈ Admin_tools(Ω).
 * La designación MU ocurre DENTRO de la transacción de creación del
 * Universo (§18.3) — jamás por auto-promoción. Tolera esquema pre-154
 * (deriva local↔PROD declarada) devolviendo SCHEMA_PRE_154 sin escribir.
 */

type ExecuteCall = [string, unknown[]?];

function fakeConnection(handler: (sql: string, params?: unknown[]) => unknown[][] | object): {
  conn: PoolConnection;
  calls: ExecuteCall[];
} {
  const calls: ExecuteCall[] = [];
  const conn = {
    execute: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push([sql, params]);
      return [handler(sql, params), undefined];
    }),
  } as unknown as PoolConnection;
  return { conn, calls };
}

const SCHEMA_PRESENT = (sql: string): unknown[][] | object => {
  if (sql.includes('information_schema')) return [{ present: 2 }] as unknown as unknown[][];
  if (sql.includes('UPDATE tenants')) return { affectedRows: 1 } as object;
  return { affectedRows: 1 } as object;
};

describe('FC062-F6 — designateMasterOfUniverse', () => {
  beforeEach(() => {
    resetBootstrapSchemaCache();
  });

  it('F6-1 (Scenario 8): con esquema 154 designa MU en membership y ancla mu_user_id — misma transacción', async () => {
    const { conn, calls } = fakeConnection(SCHEMA_PRESENT);
    const result = await designateMasterOfUniverse(conn, { tenantId: 9100, userId: 77 });
    expect(result).toBe('MU_DESIGNATED');
    const sqls = calls.map(([s]) => s.replace(/\s+/g, ' '));
    expect(sqls.some((s) => s.includes("cosmonaut_type = 'MU'"))).toBe(true);
    expect(sqls.some((s) => s.includes('UPDATE tenants SET mu_user_id'))).toBe(true);
    // I1: el ancla solo se escribe si estaba vacía
    const anchor = sqls.find((s) => s.includes('UPDATE tenants SET mu_user_id'));
    expect(anchor).toContain('mu_user_id IS NULL');
  });

  it('F6-2 (I1): si el Universo ya tiene MU anclado, lanza MuAlreadyDesignatedError', async () => {
    const { conn } = fakeConnection((sql) => {
      if (sql.includes('information_schema')) return [{ present: 2 }] as unknown as unknown[][];
      if (sql.includes('UPDATE tenants')) return { affectedRows: 0 } as object; // ancla ocupada
      return { affectedRows: 1 } as object;
    });
    await expect(
      designateMasterOfUniverse(conn, { tenantId: 9100, userId: 78 })
    ).rejects.toBeInstanceOf(MuAlreadyDesignatedError);
  });

  it('F6-3 (deriva pre-154): sin columnas cosmonaut_type/mu_user_id retorna SCHEMA_PRE_154 sin escribir', async () => {
    const { conn, calls } = fakeConnection((sql) => {
      if (sql.includes('information_schema')) return [{ present: 0 }] as unknown as unknown[][];
      return { affectedRows: 1 } as object;
    });
    const result = await designateMasterOfUniverse(conn, { tenantId: 9100, userId: 79 });
    expect(result).toBe('SCHEMA_PRE_154');
    const writes = calls.filter(([s]) => /UPDATE|INSERT|DELETE/i.test(s));
    expect(writes).toHaveLength(0);
  });

  it('F6-4: la detección de esquema se cachea — una sola consulta a information_schema', async () => {
    const { conn, calls } = fakeConnection(SCHEMA_PRESENT);
    await designateMasterOfUniverse(conn, { tenantId: 1, userId: 1 });
    await designateMasterOfUniverse(conn, { tenantId: 2, userId: 2 });
    const schemaQueries = calls.filter(([s]) => s.includes('information_schema'));
    expect(schemaQueries).toHaveLength(1);
  });
});
