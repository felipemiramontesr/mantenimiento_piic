import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { findLinkTargetTenant, insertTypedMembership } from './universeMembership.repository';
import { listUniverses } from './universeList.repository';

/** FC206 F1 — SQL de la vinculación (Universo destino con su ancla MU y membresía tipada). */

vi.mock('./db', () => ({ default: {} }));

const executor = { execute: vi.fn() } as unknown as Pool & { execute: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findLinkTargetTenant', () => {
  it.each([
    [7, true],
    [null, false],
  ])('mu_user_id %s → hasMu %s', async (muUserId, hasMu) => {
    executor.execute.mockResolvedValueOnce([
      [{ id: 41, label: 'Flota', mu_user_id: muUserId }],
      [],
    ]);
    expect(await findLinkTargetTenant(41, executor)).toEqual({ id: 41, label: 'Flota', hasMu });
    expect(executor.execute).toHaveBeenCalledWith(
      'SELECT id, label, mu_user_id FROM tenants WHERE id = ?',
      [41]
    );
  });

  it('Universo inexistente → null', async () => {
    executor.execute.mockResolvedValueOnce([[], []]);
    expect(await findLinkTargetTenant(99, executor)).toBeNull();
  });
});

describe('insertTypedMembership', () => {
  it('fija cosmonaut_type en el mismo INSERT', async () => {
    executor.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertTypedMembership(20, 41, 'ARC', executor);
    expect(executor.execute).toHaveBeenCalledWith(
      'INSERT INTO tenant_user_memberships (user_id, owner_id, cosmonaut_type) VALUES (?, ?, ?)',
      [20, 41, 'ARC']
    );
  });
});

describe('listUniverses (universeList.repository)', () => {
  it('trae hasMu del ancla mu_user_id', async () => {
    executor.execute.mockResolvedValueOnce([[], []]);
    await listUniverses(executor);
    expect(executor.execute.mock.calls[0][0]).toContain('(t.mu_user_id IS NOT NULL) AS hasMu');
  });
});
