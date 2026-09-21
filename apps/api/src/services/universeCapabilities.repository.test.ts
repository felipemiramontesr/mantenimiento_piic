import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import findActiveCapabilities from './universeCapabilities.repository';

/** FC193 F2 — SQL boundary de capacidades: filtro por tenant en ambas ramas, solo ACTIVE, sin SELECT *. */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

const execute = db.execute as Mock;

describe('FC193 F2 — findActiveCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve las filas (kind, code) tal como las entrega la DB', async () => {
    const rows = [
      { kind: 'SUPERCLUSTER', code: 'FINANZAS' },
      { kind: 'CLUSTER', code: 'GASTOS_EGRESOS' },
    ];
    execute.mockResolvedValue([rows, undefined]);

    await expect(findActiveCapabilities(9)).resolves.toBe(rows);
  });

  it('anti-BOLA: parametriza el tenant en las DOS ramas del UNION y filtra solo ACTIVE', async () => {
    execute.mockResolvedValue([[], undefined]);

    await findActiveCapabilities(9);

    const [sql, params] = execute.mock.calls[0];
    expect(params).toEqual([9, 9]);
    expect(String(sql).match(/tenant_id = \?/g)).toHaveLength(2);
    expect(String(sql).match(/state = 'ACTIVE'/g)).toHaveLength(2);
    expect(String(sql)).toContain('UNION ALL');
  });

  it('anti-BOPLA: columnas explícitas, jamás SELECT *', async () => {
    execute.mockResolvedValue([[], undefined]);

    await findActiveCapabilities(9);

    expect(String(execute.mock.calls[0][0])).not.toMatch(/SELECT\s+\*/i);
  });
});
