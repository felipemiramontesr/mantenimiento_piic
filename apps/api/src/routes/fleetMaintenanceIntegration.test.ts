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

vi.mock('../services/workOrderService', () => ({
  createWorkOrder: vi.fn().mockResolvedValue({ workOrderId: 'WO-MOCK-1' }),
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
      execute: vi.fn().mockResolvedValue([
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
      execute: vi.fn().mockResolvedValue([
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

describe('FleetMaintenance — UPA Bridge (PATCH accept)', () => {
  const app = buildApp();
  let token: string;

  const openMovement = {
    id: 42,
    unit_id: 'ASM-001',
    status: 'OPEN',
    created_by_user_id: 1,
    service_type: 'BASIC_10K',
    technician: 'Tech A',
  };

  // execute call ordering inside accept handler (after createWorkOrder mock):
  // 1. SELECT movements  2. UPDATE status ACTIVE  3. UPDATE unit MAINTENANCE
  // 4. UPDATE upa_work_order_id  5. SELECT fleet_maintenance_details (bridge)
  // 6+. UPDATE upa_work_order_tasks (if N_A)  7+. UPDATE upa_work_order_tasks (if DEFERRED)

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'tech',
      roleId: 2,
      roleName: 'Tecnico',
      permissions: ['*'],
    });
  });

  it('Bridge — no N_A/DEFERRED details → 200 with no extra UPDATEs', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]); // bridge SELECT returns empty

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).workOrderId).toBe('WO-MOCK-1');
    expect(executeMock).toHaveBeenCalledTimes(5);
  });

  it('Bridge — N_A tasks present → UPDATE N_A_STRUCTURAL issued', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ task_code: 'triage_lights', status_code: 'N_A' }], undefined])
      .mockResolvedValueOnce([[], undefined]); // UPDATE N_A_STRUCTURAL

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(6);
    const updateCall = executeMock.mock.calls[5][0];
    expect(updateCall).toContain('N_A_STRUCTURAL');
    expect(updateCall).toContain('upa_work_order_tasks');
  });

  it('Bridge — DEFERRED tasks present → UPDATE DEFERRED_FINANCIAL issued', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ task_code: 'minor_oil', status_code: 'DEFERRED' }], undefined])
      .mockResolvedValueOnce([[], undefined]); // UPDATE DEFERRED_FINANCIAL

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(6);
    const updateCall = executeMock.mock.calls[5][0];
    expect(updateCall).toContain('DEFERRED_FINANCIAL');
    expect(updateCall).toContain('upa_work_order_tasks');
  });

  it('Bridge — both N_A and DEFERRED present → two UPDATE calls in order', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([
        [
          { task_code: 'triage_lights', status_code: 'N_A' },
          { task_code: 'minor_oil', status_code: 'DEFERRED' },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]) // UPDATE N_A_STRUCTURAL
      .mockResolvedValueOnce([[], undefined]); // UPDATE DEFERRED_FINANCIAL

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(7);
    expect(executeMock.mock.calls[5][0]).toContain('N_A_STRUCTURAL');
    expect(executeMock.mock.calls[6][0]).toContain('DEFERRED_FINANCIAL');
  });

  it('Bridge — UPDATE failure triggers rollback and returns 500', async () => {
    const rollbackMock = vi.fn();
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ task_code: 'triage_lights', status_code: 'N_A' }], undefined])
      .mockRejectedValueOnce(new Error('DB constraint error'));

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: rollbackMock,
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(500);
    expect(rollbackMock).toHaveBeenCalledOnce();
  });
});
