/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import NotificationService from '../services/notification.service';

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

vi.mock('../services/notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT', SYSTEM: 'SYSTEM' },
  ArchonNotificationPriority: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', CRITICAL: 'CRITICAL' },
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

  // ─────────────────────────────────────────────────────────────────────────
  // RED-first: JS filter correctness (filter((r) => r.status_code === 'N_A'))
  // Escenario: el mock devuelve rows que incluyen PASS junto a N_A.
  // La capa SQL WHERE ya filtra, pero este test verifica la capa JS como
  // segunda línea de defensa. Si la condición fuera mal escrita (e.g., !==),
  // este test falla y el UPDATE tocaría tareas incorrectas.
  // ─────────────────────────────────────────────────────────────────────────
  it('Bridge — JS filter excludes PASS rows even when present in mock result', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      // Bridge SELECT returns PASS + N_A rows (simulates SQL bypass to test JS filter)
      .mockResolvedValueOnce([
        [
          { task_code: 'triage_pass_task', status_code: 'PASS' },
          { task_code: 'triage_na_task', status_code: 'N_A' },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]); // UPDATE N_A_STRUCTURAL — only for triage_na_task

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
    // Exactly 6 calls: 4 pre-bridge + 1 bridge SELECT + 1 N_A UPDATE (no PASS UPDATE)
    expect(executeMock).toHaveBeenCalledTimes(6);
    const naUpdateCall = executeMock.mock.calls[5][0];
    expect(naUpdateCall).toContain('N_A_STRUCTURAL');
    // The params array must contain only 'triage_na_task', NOT 'triage_pass_task'
    const naUpdateParams = executeMock.mock.calls[5][1] as unknown[];
    expect(naUpdateParams).toContain('triage_na_task');
    expect(naUpdateParams).not.toContain('triage_pass_task');
  });
});

describe('FleetMaintenance — Push Hooks Capa 2a (PATCH complete + POST OPEN)', () => {
  const app = buildApp();
  let token: string;

  const activeMovement = {
    id: 42,
    unit_id: 'ASM-001',
    status: 'ACTIVE',
    service_date: '2026-06-10',
    service_type: 'BASIC_10K',
    service_mode: 'AGENCY',
    technician: 'Tech A',
    cost: 500,
  };

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 0,
      roleName: 'Archon',
      permissions: ['*'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildCompleteMock = () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[activeMovement], undefined]) // SELECT movements
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_movements COMPLETED
      .mockResolvedValueOnce([[{ maintIntervalKm: 10000 }], undefined]) // SELECT maintIntervalKm
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_maintenance_extensions
      .mockResolvedValueOnce([[{ odometer: 50000 }], undefined]) // SELECT odometer (applyCompletion)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE fleet_units (applyCompletion)
    return {
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
  };

  it('PATCH /complete — dispatch called with maint:write and fleet:write on success', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce(buildCompleteMock() as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/test-uuid/complete',
      payload: { odometerAtService: 50000, cost: 500, details: [] },
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ permission: 'maint:write', priority: 'HIGH' })
    );
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ permission: 'fleet:write', priority: 'HIGH' })
    );
  });

  it('PATCH /complete — HTTP 200 even if dispatch throws', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce(buildCompleteMock() as any);
    vi.mocked(NotificationService.dispatch).mockRejectedValue(new Error('FCM down'));

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/test-uuid/complete',
      payload: { odometerAtService: 50000, cost: 500, details: [] },
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('POST /maintenance OPEN — dispatch called with maint:write MEDIUM on new order', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            odometer: 40000,
            maintIntervalKm: 10000,
            status: 'Disponible',
            lastFuelLevel: 50,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([{ insertId: 99, affectedRows: 1 }, undefined]) // INSERT fleet_movements
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, undefined]); // INSERT fleet_maintenance_extensions

    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn(),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-001',
        serviceDate: '2026-06-10',
        odometerAtService: 40000,
        cost: 0,
        technician: 'Tech A',
        is_in_progress: true,
        details: [],
      },
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(201);
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ permission: 'maint:write', priority: 'MEDIUM' })
    );
  });
});
