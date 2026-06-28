/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import * as workOrderService from '../services/workOrderService';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
    createUnit: vi.fn().mockResolvedValue({ id: 'X' }),
    updateUnit: vi.fn().mockResolvedValue(true),
    deleteUnit: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn().mockResolvedValue('uuid-1'),
    finishRoute: vi.fn().mockResolvedValue(undefined),
    reportIncident: vi.fn().mockResolvedValue(undefined),
    getIncidents: vi.fn().mockResolvedValue([]),
    getAllIncidents: vi.fn().mockResolvedValue([]),
    updateRoute: vi.fn().mockResolvedValue(undefined),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/workOrderService', () => ({
  createWorkOrder: vi.fn(),
  previewWorkOrder: vi.fn(),
  updateTaskStatus: vi.fn(),
  closeWorkOrder: vi.fn(),
  getWorkOrder: vi.fn(),
  checkAndTimeoutStage5Orders: vi.fn().mockResolvedValue(0),
}));

describe('Work Order Routes', () => {
  const app = buildApp();
  let viewToken: string;
  let writeToken: string;
  let noPermToken: string;

  beforeAll(async () => {
    await app.ready();
    const base = { id: 1, username: 'operator', roleId: 2, roleName: 'Operator' };
    viewToken = app.jwt.sign({ ...base, permissions: ['workorder:view:any'] });
    writeToken = app.jwt.sign({
      ...base,
      permissions: [
        'workorder:view:any',
        'workorder:create',
        'workorder:task:manage',
        'workorder:close',
      ],
    });
    noPermToken = app.jwt.sign({ ...base, permissions: [] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/work-orders/1' });
    expect(res.statusCode).toBe(401);
  });

  // ─── GET /v1/work-orders/preview/:vehicleId ──────────────────────────────────

  describe('GET /v1/work-orders/preview/:vehicleId', () => {
    it('returns 403 with no view permission', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/preview/ASM-001',
        headers: auth(noPermToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 200 with preview data', async () => {
      vi.mocked(workOrderService.previewWorkOrder).mockResolvedValueOnce({
        vehicleId: 'ASM-001',
        odometer: 50000,
        tasks: [],
      });
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/preview/ASM-001',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.vehicleId).toBe('ASM-001');
    });

    it('returns 404 on VEHICLE_NOT_FOUND', async () => {
      vi.mocked(workOrderService.previewWorkOrder).mockRejectedValueOnce(
        new Error('VEHICLE_NOT_FOUND: ASM-999')
      );
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/preview/ASM-999',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe('NOT_FOUND');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(workOrderService.previewWorkOrder).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/preview/ASM-001',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── GET /v1/work-orders/:id ─────────────────────────────────────────────────

  describe('GET /v1/work-orders/:id', () => {
    it('returns 400 for NaN id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/abc',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for id = 0', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/0',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when work order not found', async () => {
      vi.mocked(workOrderService.getWorkOrder).mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/99',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 with work order data', async () => {
      vi.mocked(workOrderService.getWorkOrder).mockResolvedValueOnce({
        id: 1,
        uuid: 'uuid-1',
        vehicleId: 'ASM-001',
        fleetType: 'urban',
        status: 'IN_PROGRESS',
        pendingSince: null,
        openedAt: '2024-01-01T00:00:00.000Z',
        closedAt: null,
        tasks: [],
      });
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/1',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.vehicleId).toBe('ASM-001');
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(workOrderService.getWorkOrder).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/work-orders/1',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── POST /v1/work-orders/init ───────────────────────────────────────────────

  describe('POST /v1/work-orders/init', () => {
    it('returns 403 with no write permission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(viewToken),
        payload: { vehicleId: 'ASM-001' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 on validation error (empty vehicleId)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(writeToken),
        payload: { vehicleId: '' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 on VEHICLE_NOT_FOUND', async () => {
      vi.mocked(workOrderService.createWorkOrder).mockRejectedValueOnce(
        new Error('VEHICLE_NOT_FOUND: ASM-999')
      );
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(writeToken),
        payload: { vehicleId: 'ASM-999' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 422 on VALIDATION_ERROR from service', async () => {
      vi.mocked(workOrderService.createWorkOrder).mockRejectedValueOnce(
        new Error('VALIDATION_ERROR: vehicle already has open order')
      );
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(writeToken),
        payload: { vehicleId: 'ASM-001' },
      });
      expect(res.statusCode).toBe(422);
    });

    it('returns 201 on success', async () => {
      vi.mocked(workOrderService.createWorkOrder).mockResolvedValueOnce({
        workOrderId: 1,
        uuid: 'uuid-abc',
        taskCount: 5,
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(writeToken),
        payload: { vehicleId: 'ASM-001' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().data.workOrderId).toBe(1);
      expect(res.json().data.taskCount).toBe(5);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(workOrderService.createWorkOrder).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/init',
        headers: auth(writeToken),
        payload: { vehicleId: 'ASM-001' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── PATCH /v1/work-orders/:id/tasks/:taskId ────────────────────────────────

  describe('PATCH /v1/work-orders/:id/tasks/:taskId', () => {
    it('returns 403 with no write permission', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/triage_dashboard_lights',
        headers: auth(viewToken),
        payload: { status: 'completed' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 for NaN id', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/abc/tasks/some-task',
        headers: auth(writeToken),
        payload: { status: 'completed' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 on validation error (invalid status)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/some-task',
        headers: auth(writeToken),
        payload: { status: 'INVALID_STATUS' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 on TASK_NOT_FOUND', async () => {
      vi.mocked(workOrderService.updateTaskStatus).mockRejectedValueOnce(
        new Error('TASK_NOT_FOUND: no-task')
      );
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/no-task',
        headers: auth(writeToken),
        payload: { status: 'completed' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 200 on success with evidence', async () => {
      vi.mocked(workOrderService.updateTaskStatus).mockResolvedValueOnce(undefined);
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/triage_dashboard_lights',
        headers: auth(writeToken),
        payload: {
          status: 'completed',
          evidenceUrls: ['https://example.com/photo.jpg'],
          evidenceNotes: 'All done',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('returns 200 on success with DEFERRED_FINANCIAL status', async () => {
      vi.mocked(workOrderService.updateTaskStatus).mockResolvedValueOnce(undefined);
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/triage_dashboard_lights',
        headers: auth(writeToken),
        payload: { status: 'DEFERRED_FINANCIAL' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(workOrderService.updateTaskStatus).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/work-orders/1/tasks/some-task',
        headers: auth(writeToken),
        payload: { status: 'pending' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── POST /v1/work-orders/:id/close ─────────────────────────────────────────

  describe('POST /v1/work-orders/:id/close', () => {
    it('returns 403 with no write permission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/1/close',
        headers: auth(viewToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 for NaN id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/abc/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for id = 0', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/0/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 on WORK_ORDER_NOT_FOUND', async () => {
      vi.mocked(workOrderService.closeWorkOrder).mockRejectedValueOnce(
        new Error('WORK_ORDER_NOT_FOUND: 99')
      );
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/99/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 on ALREADY_CLOSED', async () => {
      vi.mocked(workOrderService.closeWorkOrder).mockRejectedValueOnce(
        new Error('ALREADY_CLOSED: 1')
      );
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/1/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(409);
    });

    it('returns 200 on success', async () => {
      vi.mocked(workOrderService.closeWorkOrder).mockResolvedValueOnce(undefined);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/1/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('returns 500 on unexpected error', async () => {
      vi.mocked(workOrderService.closeWorkOrder).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/work-orders/1/close',
        headers: auth(writeToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
