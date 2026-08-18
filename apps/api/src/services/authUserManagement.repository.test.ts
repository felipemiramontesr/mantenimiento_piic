/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  insertOwnerMemberships,
  findGrayManCosmonautRoleId,
} from './authUserManagement.repository';

/**
 * FC162 R2 (100% mandatorio) — 2 ramas de authUserManagement.repository.ts
 * sin test directo: el early-return de `insertOwnerMemberships` con
 * ownerIds vacío (defensivo — el único caller real ya lo gatea antes de
 * llamar, pero la función exportada declara su propio contrato) y el
 * branch "no encontrado" de `findGrayManCosmonautRoleId` (el branch
 * "encontrado" ya se ejercita indirectamente vía authIntegration.test.ts).
 */

const mockExecutor = { execute: vi.fn() } as unknown as { execute: ReturnType<typeof vi.fn> };

describe('insertOwnerMemberships', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns early without querying when ownerIds is empty', async () => {
    await insertOwnerMemberships('5', [], mockExecutor as any);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  it('inserts one row per ownerId when non-empty', async () => {
    mockExecutor.execute.mockResolvedValueOnce([{ affectedRows: 2 }]);
    await insertOwnerMemberships('5', [10, 20], mockExecutor as any);
    const [sql, params] = mockExecutor.execute.mock.calls[0];
    expect(sql).toContain('INSERT INTO user_owner_membership');
    expect(params).toEqual([5, 10, 5, 20]);
  });
});

describe('findGrayManCosmonautRoleId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the role id when the GrayMan role exists', async () => {
    mockExecutor.execute.mockResolvedValueOnce([[{ id: 8 }]]);
    await expect(findGrayManCosmonautRoleId(mockExecutor as any)).resolves.toBe(8);
  });

  it('returns null when the GrayMan role is absent', async () => {
    mockExecutor.execute.mockResolvedValueOnce([[]]);
    await expect(findGrayManCosmonautRoleId(mockExecutor as any)).resolves.toBeNull();
  });
});
