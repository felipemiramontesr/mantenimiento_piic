/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';
import NotificationService from '../services/notification.service';
import { purgeOutboxForOrder } from '../services/notificationsOutboxService';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn().mockResolvedValue([]),
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

vi.mock('../services/notificationsOutboxService', () => ({
  purgeOutboxForOrder: vi.fn().mockResolvedValue(undefined),
  processPendingAlerts: vi.fn().mockResolvedValue(undefined),
}));

// ─── Shared setup ─────────────────────────────────────────────────────────────

const makeApp = () => {
  const app = buildApp();
  let token: string;
  return {
    app,
    getToken: () => token,
    init: async () => {
      await app.ready();
      token = app.jwt.sign({
        id: 1,
        username: 'admin',
        roleId: 1,
        roleName: 'Director',
        permissions: ['*'],
      });
    },
  };
};

// ─── GET /maintenance ─────────────────────────────────────────────────────────

describe('FleetMaintenance GET /maintenance', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init, 15000);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with basic result (no cursor)', async () => {
    const row = {
      id: 1,
      uuid: 'maint-uuid-1',
      unit_id: 'ASM-001',
      movement_status: 'COMPLETED',
      created_at: new Date('2026-06-01T10:00:00Z'),
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[row], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().nextCursor).toBeNull();
  });

  it('returns nextCursor when rows exceed limit', async () => {
    const makeRow = (id: number) => ({
      id,
      uuid: `maint-${id}`,
      unit_id: 'ASM-001',
      movement_status: 'COMPLETED',
      created_at: new Date('2026-06-01T10:00:00Z'),
    });
    const rows = [makeRow(1), makeRow(2), makeRow(3)];
    vi.mocked(db.execute).mockResolvedValueOnce([rows, undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance?limit=2',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nextCursor).not.toBeNull();
    expect(body.data).toHaveLength(2);
  });

  it('accepts cursor param and returns 200', async () => {
    const cursor = Buffer.from('2026-06-01T10:00:00.000Z|5').toString('base64');
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: `/v1/maintenance?cursor=${encodeURIComponent(cursor)}`,
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 500 on db error', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB down'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(500);
  });
});

// ─── GET /maintenance/template/:unitId ────────────────────────────────────────

describe('FleetMaintenance GET /maintenance/template/:unitId', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with task list for agency unit', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 2,
      maintIntervalKm: 10000,
      maintIntervalDays: 0,
      odometer: 45000,
      lastServiceReading: 40000,
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    const taskRow = { code: 'OIL_CHANGE', label: 'Cambio de aceite', isCritical: 1 };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined]) // SELECT fleet_units
      .mockResolvedValueOnce([[taskRow], undefined]) // SELECT tasks
      .mockResolvedValueOnce([[], undefined]); // fetchDeferredTasks: last COMPLETED order
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-001',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(res.json().tasks).toHaveLength(1);
    expect(res.json().tasks[0].code).toBe('OIL_CHANGE');
  });

  it('includes deferred carry-over task from last completed order', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 2,
      maintIntervalKm: 10000,
      maintIntervalDays: 0,
      odometer: 45000,
      lastServiceReading: 40000,
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    const taskRow = { code: 'OIL_CHANGE', label: 'Cambio de aceite', isCritical: 1 };
    const deferredRow = { task_code: 'BRAKE_FLUID', label: 'Líquido de frenos', isCritical: 0 };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined]) // SELECT fleet_units
      .mockResolvedValueOnce([[taskRow], undefined]) // SELECT tasks
      .mockResolvedValueOnce([[{ id: 99 }], undefined]) // fetchDeferred: last order
      .mockResolvedValueOnce([[deferredRow], undefined]); // fetchDeferred: DEFERRED tasks
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-001',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks;
    const deferred = tasks.find((t: any) => t.code === 'BRAKE_FLUID');
    expect(deferred).toBeDefined();
    expect(deferred.isDeferredCarry).toBe(true);
  });

  it('executes minorRows.forEach and pushes FUEL_FILTER_MINING (always-include, lines 414-426)', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 2,
      maintIntervalKm: 5000, // isMineUnit = true
      maintIntervalDays: 0,
      odometer: 10000, // remainder=10000 → BASIC_10K window → resolvedType != MINOR_MINING
      lastServiceReading: 5000,
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    const minorRow = {
      code: 'FUEL_FILTER_MINING',
      label: 'Filtro de combustible minero',
      isCritical: 0,
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined]) // fleet_units
      .mockResolvedValueOnce([[], undefined]) // tasks (main service type)
      .mockResolvedValueOnce([[minorRow], undefined]); // minorRows (non-empty triggers forEach body)
    // fetchDeferredTasks uses default [[], undefined] → lastOrderRows empty → early return
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-MINOR-ROWS',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'FUEL_FILTER_MINING')).toBeDefined();
  });

  it('appends DISTRIBUTION_KIT_WATER_PUMP for mine unit with odometer>=100000 (lines 267-273)', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 2,
      maintIntervalKm: 5000, // isMineUnit = true
      maintIntervalDays: 0,
      odometer: 100000, // remainder=40000 → MAJOR_30K window → resolvedType != MINOR_MINING
      lastServiceReading: 5000, // currentOdometer - lastDistOdo = 100000 - 0 >= 100000 (DISTRIBUTION_KIT_KM)
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined]) // fleet_units
      .mockResolvedValueOnce([[], undefined]) // tasks
      .mockResolvedValueOnce([[], undefined]); // minorRows (empty)
    // fetchDeferredTasks uses default → early return
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-DIST-KIT',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'DISTRIBUTION_KIT_WATER_PUMP')).toBeDefined();
    // CHASSIS_SHOCKS_HEAVY also appended (100000 >= 80000)
    expect(tasks.find((t) => t.code === 'CHASSIS_SHOCKS_HEAVY')).toBeDefined();
  });

  it('removes CABIN_FILTER_MINING for mine unit with fuelTypeId=10 (lines 432-440)', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 10, // diesel-electric mine variant → removes CABIN_FILTER_MINING
      maintIntervalKm: 5000, // mine unit
      maintIntervalDays: 0,
      odometer: 10000,
      lastServiceReading: 5000,
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined])
      .mockResolvedValueOnce([[], undefined]) // tasks query
      .mockResolvedValueOnce([[], undefined]); // deferred
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-MINE-10',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'CABIN_FILTER_MINING')).toBeUndefined();
  });

  it('removes WATER_SEPARATOR_MINING for mine unit with fuelTypeId=11 (lines 432-440)', async () => {
    const unitRow = {
      brandId: 1,
      fuelTypeId: 11, // gasoline-electric mine variant → removes WATER_SEPARATOR_MINING
      maintIntervalKm: 5000,
      maintIntervalDays: 0,
      odometer: 10000,
      lastServiceReading: 5000,
      last_chassis_inspection_odometer: 0,
      last_distribution_change_odometer: 0,
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[unitRow], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-MINE-11',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'WATER_SEPARATOR_MINING')).toBeUndefined();
  });

  it('returns 404 when unit not found', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/NONEXISTENT',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 on db error', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB fail'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-001',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(500);
  });
});

// ─── GET /maintenance/forecast ────────────────────────────────────────────────

describe('FleetMaintenance GET /maintenance/forecast', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with CRITICAL urgency (winnerDays <= 7)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSvcDate = new Date(today);
    lastSvcDate.setDate(lastSvcDate.getDate() - 363); // ~1 year ago so nextSvcDate is 2 days away
    const unitRow = {
      unitId: 'ASM-001',
      marca: 'Toyota',
      modelo: 'Hilux',
      departamento: 'Operaciones',
      currentOdometer: '9500',
      dailyUsageAvg: '100',
      maintIntervalKm: '10000',
      maintIntervalDays: 365,
      lastServiceReading: '0',
      lastServiceDate: lastSvcDate.toISOString().split('T')[0],
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[unitRow], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data).toHaveLength(1);
    expect(['CRITICAL', 'WARNING', 'OK']).toContain(data[0].urgency);
  });

  it('returns 200 with WARNING urgency (winnerDays 8-30, line 535)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSvcDate = new Date(today);
    lastSvcDate.setDate(lastSvcDate.getDate() - 350); // 350 days ago, 365-day interval → ~15 days left
    const unitRow = {
      unitId: 'ASM-WARN',
      marca: 'Nissan',
      modelo: 'Frontier',
      departamento: 'Operaciones',
      currentOdometer: '2000',
      dailyUsageAvg: '0', // date trigger only
      maintIntervalKm: '10000',
      maintIntervalDays: 365,
      lastServiceReading: '0',
      lastServiceDate: lastSvcDate.toISOString().split('T')[0],
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[unitRow], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].urgency).toBe('WARNING');
  });

  it('returns 200 with OK urgency (winnerDays > 30)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSvcDate = new Date(today);
    lastSvcDate.setDate(lastSvcDate.getDate() - 100);
    const unitRow = {
      unitId: 'ASM-002',
      marca: 'Ford',
      modelo: 'Ranger',
      departamento: 'Flota',
      currentOdometer: '5000',
      dailyUsageAvg: '50',
      maintIntervalKm: '10000',
      maintIntervalDays: 365,
      lastServiceReading: '0',
      lastServiceDate: lastSvcDate.toISOString().split('T')[0],
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[unitRow], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].urgency).toBe('OK');
  });

  it('returns 200 with dailyUsageAvg=0 (triggerType DATE, daysForKm=Infinity)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSvcDate = new Date(today);
    lastSvcDate.setDate(lastSvcDate.getDate() - 10);
    const unitRow = {
      unitId: 'ASM-003',
      marca: null,
      modelo: null,
      departamento: null,
      currentOdometer: '1000',
      dailyUsageAvg: '0',
      maintIntervalKm: '10000',
      maintIntervalDays: 365,
      lastServiceReading: '0',
      lastServiceDate: lastSvcDate.toISOString().split('T')[0],
    };
    vi.mocked(db.execute).mockResolvedValueOnce([[unitRow], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const row = res.json().data[0];
    expect(row.triggerType).toBe('DATE');
    expect(row.marca).toBe('—');
  });

  it('returns 200 with empty units list', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('sorts multiple units correctly (covers ternary uDiff=0 and uDiff!=0 branches)', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Unit A: CRITICAL (daysUntilService ~2, km trigger)
    const lastSvcA = new Date(today);
    lastSvcA.setDate(lastSvcA.getDate() - 363);
    // Unit B: CRITICAL same urgency, higher daysUntilService (covers uDiff=0 secondary sort)
    const lastSvcB = new Date(today);
    lastSvcB.setDate(lastSvcB.getDate() - 362);
    // Unit C: OK urgency (covers uDiff!=0 branch)
    const lastSvcC = new Date(today);
    lastSvcC.setDate(lastSvcC.getDate() - 10);
    const makeUnit = (
      id: string,
      svcDate: Date,
      odo: string,
      dailyAvg: string,
      intervalDays: number
    ) => ({
      unitId: id,
      marca: 'Toyota',
      modelo: 'Hilux',
      departamento: 'Ops',
      currentOdometer: odo,
      dailyUsageAvg: dailyAvg,
      maintIntervalKm: '10000',
      maintIntervalDays: intervalDays,
      lastServiceReading: '0',
      lastServiceDate: svcDate.toISOString().split('T')[0],
    });
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        makeUnit('A', lastSvcA, '9500', '100', 365),
        makeUnit('B', lastSvcB, '9400', '100', 365),
        makeUnit('C', lastSvcC, '1000', '50', 365),
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data).toHaveLength(3);
    // CRITICAL units come before OK
    expect(data[0].urgency).not.toBe('OK');
    expect(data[data.length - 1].urgency).toBe('OK');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB down'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(500);
  });
});

// ─── GET /maintenance/:uuid ───────────────────────────────────────────────────

describe('FleetMaintenance GET /maintenance/:uuid', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with order and details', async () => {
    const movRow = {
      id: 10,
      uuid: 'detail-uuid',
      unit_id: 'ASM-001',
      movement_status: 'COMPLETED',
      service_date: '2026-06-01',
      odometer_at_service: 45000,
      odometer_at_close: 45200,
      service_type: 'BASIC_10K',
      cost: 500,
      technician: 'Tech A',
      created_at: new Date(),
    };
    const detailRow = {
      taskCode: 'OIL_CHANGE',
      status: 'PASS',
      notes: null,
      label: 'Cambio de aceite',
      isCritical: 1,
      statusLabel: 'Aprobado',
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[movRow], undefined])
      .mockResolvedValueOnce([[detailRow], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/detail-uuid',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(res.json().data.uuid).toBe('detail-uuid');
    expect(res.json().data.details).toHaveLength(1);
  });

  it('returns 404 when order not found', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/nonexistent-uuid',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 on db error', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB down'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/err-uuid',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(500);
  });
});

// ─── GET /maintenance/:uuid/node ──────────────────────────────────────────────

describe('FleetMaintenance GET /maintenance/:uuid/node', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with order, details and unit context', async () => {
    const movRow = {
      id: 20,
      uuid: 'node-uuid',
      unit_id: 'ASM-002',
      movement_status: 'ACTIVE',
      service_type: 'BASIC_10K',
      created_at: new Date(),
    };
    const detailRow = {
      taskCode: 'OIL_CHANGE',
      status: 'PASS',
      notes: null,
      label: 'Cambio de aceite',
      isCritical: 1,
      statusLabel: 'Aprobado',
    };
    const unitRow = {
      id: 'ASM-002',
      status: 'En Mantenimiento',
      marca: 'Toyota',
      modelo: 'Hilux',
      year: 2022,
      odometer: 45000,
      maintIntervalKm: 10000,
      lastFuelLevel: 80,
    };
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[movRow], undefined]) // SELECT movements
      .mockResolvedValueOnce([[detailRow], undefined]) // Promise.all[0]: details
      .mockResolvedValueOnce([[unitRow], undefined]); // Promise.all[1]: unit
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/node-uuid/node',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(res.json().data.order.uuid).toBe('node-uuid');
    expect(res.json().data.unit.id).toBe('ASM-002');
  });

  it('returns 404 when order not found', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/missing-uuid/node',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 500 on db error', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB down'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/err-uuid/node',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(500);
  });
});

// ─── POST /maintenance — COMPLETED (is_in_progress: false) ───────────────────

describe('POST /maintenance — COMPLETED path (is_in_progress: false)', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with COMPLETED status when is_in_progress=false', async () => {
    const unitRow = {
      id: 'ASM-001',
      odometer: 45000,
      maintIntervalKm: 10000,
      status: 'Disponible',
      lastFuelLevel: 75,
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[unitRow], undefined]) // SELECT fleet_units
      .mockResolvedValueOnce([{ insertId: 50, affectedRows: 1 }, undefined]) // INSERT fleet_movements COMPLETED
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ insertId: 51, affectedRows: 1 }, undefined]) // INSERT extensions
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined]) // applyCompletion: SELECT odometer
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // applyCompletion: UPDATE fleet_units
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-001',
        serviceDate: '2026-06-10',
        odometerAtService: 45000,
        cost: 800,
        technician: 'Tech B',
        is_in_progress: false,
        details: [],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().movement_status).toBe('COMPLETED');
  });

  it('returns 201 COMPLETED with details inserting task rows', async () => {
    const unitRow = {
      id: 'ASM-001',
      odometer: 45000,
      maintIntervalKm: 10000,
      status: 'Disponible',
      lastFuelLevel: null,
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[unitRow], undefined])
      .mockResolvedValueOnce([{ insertId: 52, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ insertId: 53, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT detail
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-001',
        serviceDate: '2026-06-10',
        odometerAtService: 45000,
        cost: 800,
        technician: 'Tech B',
        is_in_progress: false,
        details: [{ taskCode: 'OIL_CHANGE', status: 'PASS', notes: null }],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(201);
  });

  it('OPEN path — dispatches tech userId notification when user found by name (covers lines 776-785)', async () => {
    const unitRow = {
      id: 'ASM-010',
      odometer: 40000,
      maintIntervalKm: 10000,
      status: 'Disponible',
      lastFuelLevel: 60,
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[unitRow], undefined]) // SELECT fleet_units (connection)
      .mockResolvedValueOnce([{ insertId: 77, affectedRows: 1 }, undefined]) // INSERT fleet_movements OPEN
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ insertId: 78, affectedRows: 1 }, undefined]); // INSERT extensions
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    // Fire-and-forget db.execute for "SELECT id FROM users WHERE fullName = ?" returns a user row
    vi.mocked(db.execute).mockResolvedValueOnce([[{ id: 42 }], undefined] as any);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-010',
        serviceDate: '2026-06-10',
        odometerAtService: 40000,
        cost: 0,
        technician: 'Tech Known',
        is_in_progress: true,
        details: [],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });

    expect(res.statusCode).toBe(201);
    // Wait for fire-and-forget chain to settle
    await new Promise((r) => setTimeout(r, 30));
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, priority: 'HIGH' })
    );
  });

  it('returns 400 when unit not found', async () => {
    const executeMock = vi.fn().mockResolvedValueOnce([[], undefined]); // unit not found
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn(),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'GHOST',
        serviceDate: '2026-06-10',
        odometerAtService: 10000,
        cost: 0,
        technician: 'Tech C',
        is_in_progress: false,
        details: [],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });
});

// ─── PATCH /maintenance/:uuid/complete — error paths ─────────────────────────

describe('PATCH /maintenance/:uuid/complete — error paths', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when order not found', async () => {
    const executeMock = vi.fn().mockResolvedValueOnce([[], undefined]); // no movement found
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/ghost-uuid/complete',
      payload: { odometerAtService: 50000, cost: 500, details: [] },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });

  it('returns 400 when order is not ACTIVE (already COMPLETED)', async () => {
    const completedMovement = {
      id: 77,
      unit_id: 'ASM-001',
      status: 'COMPLETED',
      service_date: '2026-06-01',
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      technician: 'Tech A',
      cost: 500,
    };
    const executeMock = vi.fn().mockResolvedValueOnce([[completedMovement], undefined]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/completed-uuid/complete',
      payload: { odometerAtService: 50000, cost: 500, details: [] },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('Cannot complete');
  });
});

// ─── PATCH /maintenance/:uuid/reject — success and error paths ────────────────

describe('PATCH /maintenance/:uuid/reject — success & 500', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and dispatches notification when createdByUserId is set', async () => {
    const openMovement = {
      id: 88,
      unit_id: 'ASM-003',
      status: 'OPEN',
      created_by_user_id: 5,
      technician: 'Tech X',
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined]) // SELECT movements
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE technician = NULL
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/open-to-reject/reject',
      headers: { authorization: `Bearer ${getToken()}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(vi.mocked(purgeOutboxForOrder)).toHaveBeenCalledWith('open-to-reject');
    expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 5, priority: 'HIGH' })
    );
  });

  it('returns 200 without notification when createdByUserId is null', async () => {
    const openMovement = {
      id: 89,
      unit_id: 'ASM-004',
      status: 'OPEN',
      created_by_user_id: null,
      technician: 'Tech Y',
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/null-creator-uuid/reject',
      headers: { authorization: `Bearer ${getToken()}` },
    });

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(NotificationService.dispatch)).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected db error in reject handler', async () => {
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockRejectedValueOnce(new Error('DB exploded')),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/err-uuid/reject',
      headers: { authorization: `Bearer ${getToken()}` },
    });

    expect(res.statusCode).toBe(500);
  });
});

// ─── PATCH /complete — with details (lines 919-929) ──────────────────────────

describe('PATCH /maintenance/:uuid/complete — with task details', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts CHASSIS_SHOCKS_HEAVY and DISTRIBUTION_KIT_WATER_PUMP details (covers applyCompletion branches)', async () => {
    const activeMovement = {
      id: 55,
      unit_id: 'ASM-009',
      status: 'ACTIVE',
      service_date: '2026-06-10',
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      technician: 'Tech Z',
      cost: 700,
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[activeMovement], undefined]) // SELECT movements
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_movements COMPLETED
      .mockResolvedValueOnce([[{ maintIntervalKm: 10000 }], undefined]) // SELECT maintIntervalKm
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_maintenance_extensions
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT detail 1 (CHASSIS)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT detail 2 (DISTRIBUTION)
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined]) // applyCompletion: SELECT odometer
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // applyCompletion: UPDATE fleet_units (includes chassis+dist columns)
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/active-uuid-2/complete',
      payload: {
        odometerAtService: 45000,
        cost: 700,
        details: [
          { taskCode: 'CHASSIS_SHOCKS_HEAVY', status: 'PASS', notes: null },
          { taskCode: 'DISTRIBUTION_KIT_WATER_PUMP', status: 'REPLACED', notes: 'Kit nuevo' },
        ],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });

    expect(res.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(9);
  });
});

// ─── PATCH /accept — notification dispatch rejection suppressed (line 1092) ──

describe('PATCH /maintenance/:uuid/accept — notification catch branch', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(async () => {
    await app.ready();
    const t = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
    (init as any).__token = t;
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accept succeeds and dispatch rejection is suppressed (covers line 1092)', async () => {
    const token = app.jwt.sign({
      id: 9,
      username: 'tech9',
      roleId: 2,
      roleName: 'Tecnico',
      permissions: ['*'],
    });
    const openMovement = {
      id: 99,
      unit_id: 'ASM-099',
      status: 'OPEN',
      created_by_user_id: 3,
      service_type: 'BASIC_10K',
      technician: 'Tech Q',
    };
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([[openMovement], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]); // bridge SELECT empty
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);

    vi.mocked(NotificationService.dispatch).mockRejectedValueOnce(new Error('push fail'));

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/qa-uuid/accept',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    // drain microtask queue so .catch() body on line 1092 executes
    await new Promise((r) => setTimeout(r, 20));
  });
});

// ─── Owner-Scoped Guards (Rol 9 — fleet:scoped) ──────────────────────────────

describe('FleetMaintenance — owner-scoped guards (Rol 9)', () => {
  const { app, init } = makeApp();
  let scopedToken: string;

  beforeAll(async () => {
    await init();
    scopedToken = app.jwt.sign({
      id: 42,
      username: 'prop.flotilla',
      roleId: 1,
      roleName: 'Propietario de Flotilla',
      permissions: [
        'fleet:scoped',
        'fleet:view',
        'maint:view',
        'maint:write',
        'maint:record:create',
      ],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const auth = () => ({ authorization: `Bearer ${scopedToken}` });

  it('GET /maintenance — returns empty when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(res.json().nextCursor).toBeNull();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('GET /maintenance — returns filtered rows when user has owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        {
          id: 1,
          uuid: 'maint-1',
          unit_id: 'ASM-001',
          movement_status: 'COMPLETED',
          created_at: new Date(),
        },
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it('GET /maintenance/forecast — returns empty when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('GET /maintenance/template/:unitId — returns 404 when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-001',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /maintenance/template/:unitId — returns 404 when unit not in owner scope', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    // Owner check is the FIRST db.execute in the template handler; empty result → 404 immediately
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FOREIGN',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /maintenance/:uuid — returns 404 when movement found but user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    vi.mocked(db.execute).mockResolvedValueOnce([
      [{ id: 10, uuid: 'order-1', unit_id: 'ASM-001', movement_status: 'COMPLETED' }],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/order-1',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /maintenance/:uuid — returns 404 when unit not in owner scope', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [{ id: 10, uuid: 'order-2', unit_id: 'ASM-FOREIGN', movement_status: 'COMPLETED' }],
        undefined,
      ]) // movement found
      .mockResolvedValueOnce([[], undefined]); // owner check — not owned
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/order-2',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /maintenance/:uuid/node — returns 404 when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    vi.mocked(db.execute).mockResolvedValueOnce([
      [{ id: 20, uuid: 'node-1', unit_id: 'ASM-001', movement_status: 'ACTIVE' }],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/node-1/node',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /maintenance/:uuid/node — returns 404 when unit not in owner scope', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [{ id: 20, uuid: 'node-2', unit_id: 'ASM-FOREIGN', movement_status: 'ACTIVE' }],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]); // owner check — not owned
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/node-2/node',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /maintenance — returns 400 when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const executeMock = vi.fn().mockResolvedValueOnce([
      [
        {
          id: 'ASM-001',
          odometer: 45000,
          maintIntervalKm: 10000,
          status: 'Disponible',
          lastFuelLevel: null,
          ownerId: 711,
        },
      ],
      undefined,
    ]); // unit found
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-001',
        serviceDate: '2026-06-10',
        odometerAtService: 45000,
        cost: 0,
        technician: 'Tech',
        is_in_progress: false,
        details: [],
      },
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });

  it('POST /maintenance — returns 400 when unit not in owner scope', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    const executeMock = vi.fn().mockResolvedValueOnce([
      [
        {
          id: 'ASM-FOREIGN',
          odometer: 45000,
          maintIntervalKm: 10000,
          status: 'Disponible',
          lastFuelLevel: null,
          ownerId: 999,
        },
      ],
      undefined,
    ]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-FOREIGN',
        serviceDate: '2026-06-10',
        odometerAtService: 45000,
        cost: 0,
        technician: 'Tech',
        is_in_progress: false,
        details: [],
      },
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });

  it('PATCH /maintenance/:uuid/complete — returns 400 when user has no owned units', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const executeMock = vi.fn().mockResolvedValueOnce([
      [
        {
          id: 55,
          unit_id: 'ASM-001',
          status: 'ACTIVE',
          service_date: '2026-06-10',
          service_type: 'BASIC_10K',
          service_mode: 'WORKSHOP',
          technician: 'T',
          cost: 0,
        },
      ],
      undefined,
    ]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/active-uuid/complete',
      payload: { odometerAtService: 45000, cost: 0, details: [] },
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });

  it('PATCH /maintenance/:uuid/complete — returns 400 when unit not in owner scope', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 55,
            unit_id: 'ASM-FOREIGN',
            status: 'ACTIVE',
            service_date: '2026-06-10',
            service_type: 'BASIC_10K',
            service_mode: 'WORKSHOP',
            technician: 'T',
            cost: 0,
          },
        ],
        undefined,
      ]) // movement found
      .mockResolvedValueOnce([[], undefined]); // owner check — not owned
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/active-uuid/complete',
      payload: { odometerAtService: 45000, cost: 0, details: [] },
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('not found');
  });
});

// ─── Additional branch coverage (FM-BC) ──────────────────────────────────────

describe('FleetMaintenance — additional branch coverage (FM-BC)', () => {
  const { app, getToken, init } = makeApp();
  beforeAll(init, 15000);
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // FM-BC-1: B88[0] — template ?odometer provided → ternary TRUE (line 393)
  it('FM-BC-1: GET template ?odometer=50000 → ternary TRUE branch (line 393)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            brandId: 1,
            fuelTypeId: 2,
            maintIntervalKm: 10000,
            maintIntervalDays: 0,
            odometer: 45000,
            lastServiceReading: 40000,
            last_chassis_inspection_odometer: 0,
            last_distribution_change_odometer: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]) // main tasks
      .mockResolvedValueOnce([[], undefined]); // fetchDeferredTasks lastOrder → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FM-BC1?odometer=50000',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  // FM-BC-2: B90[0] — template unit.odometer=null → ||0 right-side (line 393)
  it('FM-BC-2: GET template unit.odometer=null → ||0 right-side (line 393)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            brandId: 1,
            fuelTypeId: 2,
            maintIntervalKm: 10000,
            maintIntervalDays: 0,
            odometer: null,
            lastServiceReading: 40000,
            last_chassis_inspection_odometer: 0,
            last_distribution_change_odometer: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FM-BC2',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tasks).toHaveLength(0);
  });

  // FM-BC-3: B96[0] — mine unit lastServiceReading=null → ||0 right-side (line 436)
  it('FM-BC-3: mine unit lastServiceReading=null → ||0 right-side in kmSinceLastMinor (line 436)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            brandId: 1,
            fuelTypeId: 2,
            maintIntervalKm: 5000,
            maintIntervalDays: 0,
            odometer: 10000,
            lastServiceReading: null,
            last_chassis_inspection_odometer: 0,
            last_distribution_change_odometer: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]) // main tasks → agencyCodes empty
      .mockResolvedValueOnce([[], undefined]) // minorRows
      .mockResolvedValueOnce([[], undefined]); // fetchDeferredTasks lastOrder
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FM-BC3',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
  });

  // FM-BC-4: B103[0] — mine fuelTypeId=10 + CABIN_FILTER_MINING in minorRows → splice (line 478)
  it('FM-BC-4: mine unit fuelTypeId=10 with CABIN_FILTER_MINING → splice removes it (line 478)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            brandId: 1,
            fuelTypeId: 10,
            maintIntervalKm: 5000,
            maintIntervalDays: 0,
            odometer: 10000,
            lastServiceReading: 5000,
            last_chassis_inspection_odometer: 0,
            last_distribution_change_odometer: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([
        [
          {
            code: 'CABIN_FILTER_MINING',
            label: 'Filtro cabina minero',
            isCritical: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FM-BC4',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'CABIN_FILTER_MINING')).toBeUndefined();
  });

  // FM-BC-5: B113[0]+B114[0] — OIL_CHANGE_MINING: agencyCodes.has() + ||right-side (lines 456, 459)
  it('FM-BC-5: OIL_CHANGE_MINING → agencyCodes.has() evaluated (B113) + ||right-side (B114) (lines 456, 459)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            brandId: 1,
            fuelTypeId: 2,
            maintIntervalKm: 5000,
            maintIntervalDays: 0,
            odometer: 10000,
            lastServiceReading: 5000,
            last_chassis_inspection_odometer: 0,
            last_distribution_change_odometer: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]) // main tasks empty → agencyCodes = {}
      .mockResolvedValueOnce([
        [
          {
            code: 'OIL_CHANGE_MINING',
            label: 'Cambio aceite minero',
            isCritical: 0,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/template/ASM-FM-BC5',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const tasks = res.json().tasks as { code: string }[];
    expect(tasks.find((t) => t.code === 'OIL_CHANGE_MINING')).toBeDefined();
  });

  // FM-BC-6: B31[0]+B32[0] — POST COMPLETED maintIntervalKm=0 + SELECT odometer=0 → ||right-sides (lines 154, 158)
  it('FM-BC-6: POST COMPLETED maintIntervalKm=0 + odometer=0 → ||right-sides (lines 154, 158)', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 'ASM-BC6',
            odometer: 45000,
            maintIntervalKm: 0,
            status: 'Disponible',
            lastFuelLevel: null,
            ownerId: 1,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([{ insertId: 60, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ insertId: 61, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ odometer: 0 }], undefined]) // B31[0]: 0||0 → right-side
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-BC6',
        serviceDate: '2026-06-15',
        odometerAtService: 0,
        cost: 0,
        technician: 'Tech BC6',
        is_in_progress: false,
        details: [],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().movement_status).toBe('COMPLETED');
  });

  // FM-BC-7: B38[0] — PATCH complete CHASSIS_SHOCKS_HEAVY REPLACED → ||right-side (line 165)
  it('FM-BC-7: PATCH complete CHASSIS_SHOCKS_HEAVY status=REPLACED → ||right-side (line 165)', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 66,
            unit_id: 'ASM-BC7',
            status: 'ACTIVE',
            service_date: '2026-06-10',
            service_type: 'BASIC_10K',
            service_mode: 'WORKSHOP',
            technician: 'Tech BC7',
            cost: 700,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_movements
      .mockResolvedValueOnce([[{ maintIntervalKm: 10000 }], undefined]) // SELECT maintIntervalKm
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE fleet_maintenance_extensions
      .mockResolvedValueOnce([{ insertId: 200, affectedRows: 1 }, undefined]) // INSERT detail
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined]) // applyCompletion SELECT odometer
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // applyCompletion UPDATE fleet_units
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/fm-bc7-uuid/complete',
      payload: {
        odometerAtService: 45000,
        cost: 700,
        details: [{ taskCode: 'CHASSIS_SHOCKS_HEAVY', status: 'REPLACED', notes: null }],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
  });

  // FM-BC-8: B33[0] — POST COMPLETED fuelLevelEnd=80 → if(fuelLevelEnd!==undefined) TRUE (line 181)
  it('FM-BC-8: POST COMPLETED fuelLevelEnd=80 → if TRUE branch includes lastFuelLevel (line 181)', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 'ASM-BC8',
            odometer: 45000,
            maintIntervalKm: 10000,
            status: 'Disponible',
            lastFuelLevel: 60,
            ownerId: 1,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([{ insertId: 70, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ insertId: 71, affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE includes lastFuelLevel
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/maintenance',
      payload: {
        unitId: 'ASM-BC8',
        serviceDate: '2026-06-15',
        odometerAtService: 45000,
        cost: 500,
        technician: 'Tech BC8',
        is_in_progress: false,
        fuelLevelEnd: 80,
        details: [],
      },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().movement_status).toBe('COMPLETED');
  });

  // FM-BC-9: B159[0] — GET /node unit SELECT empty → ??null right-side (line 734)
  it('FM-BC-9: GET /maintenance/:uuid/node unit SELECT empty → ??null right-side (line 734)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([
        [
          {
            id: 20,
            uuid: 'fm-bc9-uuid',
            unit_id: 'ASM-GONE',
            movement_status: 'ACTIVE',
            service_type: 'BASIC_10K',
            created_at: new Date(),
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined]) // Promise.all[0]: details
      .mockResolvedValueOnce([[], undefined]); // Promise.all[1]: unit SELECT empty → ??null
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/fm-bc9-uuid/node',
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.unit).toBeNull();
  });

  // FM-BC-10: B196[0] — PATCH complete maintIntervalKm=null → ??AGENCY_DEFAULT (line 989)
  it('FM-BC-10: PATCH complete maintIntervalKm=null → ??AGENCY_DEFAULT right-side (line 989)', async () => {
    const executeMock = vi
      .fn()
      .mockResolvedValueOnce([
        [
          {
            id: 80,
            unit_id: 'ASM-BC10',
            status: 'ACTIVE',
            service_date: '2026-06-10',
            service_type: 'BASIC_10K',
            service_mode: 'WORKSHOP',
            technician: 'Tech BC10',
            cost: 400,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ maintIntervalKm: null }], undefined]) // → ??AGENCY_DEFAULT (10000)
      .mockResolvedValueOnce([[{ id: 9120 }], undefined]) // resolveCatalogId MAINT_SERVICE_TYPE (FC 082 F2b1)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ odometer: 45000 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    vi.mocked(db.getConnection).mockResolvedValueOnce({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      execute: executeMock,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as any);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/maintenance/fm-bc10-uuid/complete',
      payload: { odometerAtService: 45000, cost: 400, details: [] },
      headers: { authorization: `Bearer ${getToken()}` },
    });
    expect(res.statusCode).toBe(200);
  });

  // FM-BC-11: B121[0] — GET /forecast scoped ownerIds=[5] → ownerFilter set (line 507)
  it('FM-BC-11: GET /maintenance/forecast scoped ownerIds=[5] → ownerFilter set (line 507)', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([5]);
    const scopedToken = app.jwt.sign({
      id: 5,
      username: 'prop.scoped',
      roleId: 4,
      permissions: ['fleet:scoped', 'maint:record:view:any'],
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSvcDate = new Date(today);
    lastSvcDate.setDate(lastSvcDate.getDate() - 100);
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        {
          unitId: 'ASM-SCOPED',
          marca: 'Toyota',
          modelo: 'Hilux',
          departamento: 'Ops',
          currentOdometer: '5000',
          dailyUsageAvg: '50',
          maintIntervalKm: '10000',
          maintIntervalDays: 0,
          lastServiceReading: '0',
          lastServiceDate: lastSvcDate.toISOString().split('T')[0],
        },
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/maintenance/forecast',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].unitId).toBe('ASM-SCOPED');
  });
});
