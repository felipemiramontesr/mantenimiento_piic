/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: FleetMaintenance Routes — Security Guard
 * Validates A01:2021 Broken Access Control compliance.
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

describe('FleetMaintenance Routes — Security (A01:2021)', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
  });

  it('GET /v1/maintenance — rejects unauthenticated with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/maintenance' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /v1/maintenance — accepts authenticated request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).not.toBe(401);
  });

  it('POST /v1/maintenance — rejects unauthenticated with 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/maintenance', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('GET /v1/maintenance/template/:unitId — rejects unauthenticated with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/maintenance/template/ASM-001' });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /v1/maintenance/:uuid/accept — rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/test-uuid/accept',
    });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /v1/maintenance/:uuid/reject — rejects unauthenticated with 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/test-uuid/reject',
    });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /v1/maintenance/:uuid/accept — returns 404 when order not found', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: vi.fn().mockResolvedValue([[], undefined]),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/nonexistent-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /v1/maintenance/:uuid/reject — returns 404 when order not found', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: vi.fn().mockResolvedValue([[], undefined]),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/nonexistent-uuid/reject',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /v1/maintenance/:uuid/accept — returns 409 when order is not OPEN', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: vi
        .fn()
        .mockResolvedValue([
          [
            {
              id: 1,
              unit_id: 'ASM-001',
              status: 'ACTIVE',
              created_by_user_id: 2,
              service_type: 'BASIC_10K',
              technician: 'Tech A',
            },
          ],
          undefined,
        ]),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/active-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
  });

  it('PATCH /v1/maintenance/:uuid/reject — returns 409 when order is not OPEN', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: vi
        .fn()
        .mockResolvedValue([
          [
            {
              id: 1,
              unit_id: 'ASM-001',
              status: 'COMPLETED',
              created_by_user_id: 2,
              technician: 'Tech A',
            },
          ],
          undefined,
        ]),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/completed-uuid/reject',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
  });
});
