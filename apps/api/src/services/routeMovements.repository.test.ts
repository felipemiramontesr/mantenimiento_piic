/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { findRouteSnapshotByUuid } from './routeMovements.repository';

/**
 * FC162 F3 (100% mandatorio) — findRouteSnapshotByUuid's "not found" branch
 * (post-update audit diff) never had a direct test; every caller in
 * routeService.test.ts always mocked a matching row.
 */

describe('findRouteSnapshotByUuid — not found', () => {
  it('returns null when no row matches the uuid', async () => {
    const executor = { execute: vi.fn().mockResolvedValue([[]]) };

    const result = await findRouteSnapshotByUuid('UNKNOWN-UUID', executor as any);

    expect(result).toBeNull();
  });
});
