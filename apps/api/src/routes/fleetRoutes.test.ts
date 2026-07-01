import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import RouteService from '../services/routeService';
import NotificationService from '../services/notification.service';

// 🔱 Nucleus Mocks
vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn(),
    finishRoute: vi.fn(),
    getActiveRoute: vi.fn(),
    reportIncident: vi.fn(),
    getIncidents: vi.fn(),
    getAllIncidents: vi.fn(),
    addCheckpoint: vi.fn(),
    getCheckpoints: vi.fn(),
    arriveAtCheckpoint: vi.fn(),
  },
}));

vi.mock('../services/notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT', SYSTEM: 'SYSTEM' },
  ArchonNotificationPriority: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', CRITICAL: 'CRITICAL' },
}));

describe('FleetRoutes Endpoints - Sovereign Dispatch', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async (): Promise<void> => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Security — A01:2021 Broken Access Control', () => {
    it('should reject unauthenticated requests with 401', async (): Promise<void> => {
      const response = await app.inject({ method: 'GET', url: '/v1/routes' });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /v1/routes/start', () => {
    const validPayload = {
      unitId: 'UNIT-001',
      driverId: 1,
      startReading: 1000,
      fuelLevelStart: 100,
      destination: 'Sector 7',
    };

    it('should authorize journey start and return UUID', async (): Promise<void> => {
      (RouteService.startRoute as Mock).mockResolvedValue('UUID-NEW');

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).routeUuid).toBe('UUID-NEW');
    });

    it('should return 400 if validation fails (Zod)', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: { unitId: '' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    it('should reject stringified numbers in startReading (Strict Type Check)', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: { ...validPayload, startReading: '1000' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('Expected number, received string');
    });

    it('should return 400 on service error', async (): Promise<void> => {
      (RouteService.startRoute as Mock).mockRejectedValue(new Error('Unit busy'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: validPayload,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Unit busy');
    });
  });

  describe('PATCH /v1/routes/:uuid/finish', () => {
    it('should complete route and release unit', async (): Promise<void> => {
      (RouteService.finishRoute as Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/routes/UUID-123/finish',
        payload: { endReading: 1200, fuelLevelEnd: 90, fuelAmount: 500 },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('should return 400 on completion error', async (): Promise<void> => {
      (RouteService.finishRoute as Mock).mockRejectedValue(new Error('Invalid reading'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/routes/UUID-123/finish',
        payload: { endReading: 900, fuelLevelEnd: 90, fuelAmount: 500 },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Invalid reading');
    });
  });

  describe('GET /v1/routes/unit/:unitId/active', () => {
    it('should retrieve active journey for unit', async (): Promise<void> => {
      (RouteService.getActiveRoute as Mock).mockResolvedValue({ uuid: 'ACT-1' });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).activeRoute.uuid).toBe('ACT-1');
    });

    it('should return 400 on retrieval error', async (): Promise<void> => {
      (RouteService.getActiveRoute as Mock).mockRejectedValue(new Error('DB Error'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/routes', () => {
    it('should list all journey history', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(2);
    });

    it('should return 400 on fetch error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('Fetch error'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/unit-logs', () => {
    it('should provide full forensic journal', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 100 }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(1);
    });

    it('should return 400 on journal error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('Journal locked'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Error fetching activity logs');
    });
  });

  describe('Incident Endpoints', () => {
    it('POST /v1/routes/:uuid/incidents should record an incident', async (): Promise<void> => {
      (RouteService.reportIncident as Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'MECANICA', description: 'Falla de prueba', severity: 'LOW' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('POST /v1/routes/:uuid/incidents should return 400 if validation fails', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'INVALID' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('GET /v1/routes/:uuid/incidents should list incidents for route', async (): Promise<void> => {
      (RouteService.getIncidents as Mock).mockResolvedValue([{ id: 1 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/UUID-123/incidents',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(1);
    });

    it('GET /v1/incidents should list all incidents', async (): Promise<void> => {
      (RouteService.getAllIncidents as Mock).mockResolvedValue([{ id: 10 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/incidents',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(1);
    });

    it('GET /v1/incidents should return 400 on error', async (): Promise<void> => {
      (RouteService.getAllIncidents as Mock).mockRejectedValue(new Error('DB Fail'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/incidents',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('GET /v1/routes/:uuid/incidents should return 400 on error', async (): Promise<void> => {
      (RouteService.getIncidents as Mock).mockRejectedValue(new Error('Fetch Fail'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/UUID-123/incidents',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('POST /v1/routes/:uuid/incidents — dispatch CRITICAL when severity=CRITICAL', async (): Promise<void> => {
      (RouteService.reportIncident as Mock).mockResolvedValue(undefined);

      await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'SINIESTRO', description: 'Accidente grave', severity: 'CRITICAL' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'route:write', priority: 'CRITICAL' })
      );
    });

    it('POST /v1/routes/:uuid/incidents — dispatch HIGH when severity=HIGH', async (): Promise<void> => {
      (RouteService.reportIncident as Mock).mockResolvedValue(undefined);

      await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'MECANICA', description: 'Falla de frenos', severity: 'HIGH' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'route:write', priority: 'HIGH' })
      );
    });

    it('POST /v1/routes/:uuid/incidents — HTTP 201 even if dispatch throws', async (): Promise<void> => {
      (RouteService.reportIncident as Mock).mockResolvedValue(undefined);
      vi.mocked(NotificationService.dispatch).mockRejectedValue(new Error('FCM down'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'OPERATIVA', description: 'Falla leve', severity: 'LOW' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  // ── FC-4 Fase 4B: Checkpoint Endpoints (SC1–SC5) ──────────────────────────
  describe('Checkpoint Endpoints (FC-4 RouteCheckpoints_Waypoints)', () => {
    const CHK_UUID = 'ROUTE-CHK-UUID';

    it('SC1 — POST /v1/routes/:uuid/checkpoints creates checkpoint and returns 201', async (): Promise<void> => {
      (RouteService.addCheckpoint as Mock).mockResolvedValue(42);

      const response = await app.inject({
        method: 'POST',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        payload: { sequence: 1, name: 'Mina Norte' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toMatchObject({ success: true, data: { id: 42 } });
    });

    it('SC2 — POST /v1/routes/:uuid/checkpoints returns 409 on duplicate sequence', async (): Promise<void> => {
      (RouteService.addCheckpoint as Mock).mockRejectedValue(
        new Error("Duplicate entry '1' for key 'uq_checkpoint_sequence'")
      );

      const response = await app.inject({
        method: 'POST',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        payload: { sequence: 1, name: 'Duplicado' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).code).toBe('CONFLICT');
    });

    it('SC3 — PATCH /v1/routes/:uuid/checkpoints/:id/arrive marks checkpoint VISITED', async (): Promise<void> => {
      (RouteService.arriveAtCheckpoint as Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/routes/${CHK_UUID}/checkpoints/42/arrive`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('SC4 — GET /v1/routes/:uuid/checkpoints returns array ordered by sequence', async (): Promise<void> => {
      const mockCheckpoints = [
        { id: 1, sequence: 1, name: 'Punto A', status: 'VISITED' },
        { id: 2, sequence: 2, name: 'Punto B', status: 'PENDING' },
        { id: 3, sequence: 3, name: 'Punto C', status: 'PENDING' },
      ];
      (RouteService.getCheckpoints as Mock).mockResolvedValue(mockCheckpoints);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(3);
      expect(body.data[0].sequence).toBe(1);
    });

    it('SC5 — POST /v1/routes/:uuid/checkpoints returns 404 when route not found', async (): Promise<void> => {
      (RouteService.addCheckpoint as Mock).mockRejectedValue(new Error('Route not found'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/NO-EXIST/checkpoints',
        payload: { sequence: 1, name: 'Fantasma' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).code).toBe('NOT_FOUND');
    });

    it('SC5 — GET /v1/routes/:uuid/checkpoints returns 404 when route not found', async (): Promise<void> => {
      (RouteService.getCheckpoints as Mock).mockRejectedValue(new Error('Route not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/NO-EXIST/checkpoints',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).code).toBe('NOT_FOUND');
    });
  });

  describe('Sovereign Node Endpoints (GET /routes/:uuid/node + GET /incidents/:uuid/node)', () => {
    const ROUTE_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const INC_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

    it('SN-1: GET /routes/:uuid/node → 200 con ruta e incidentes (admin bypass)', async (): Promise<void> => {
      // resolveOwnerScope: token has '*' → null (0 DB calls)
      // checkRouteScope(uuid, null) → true (0 DB calls)
      // SELECT routeRows → 1 row; SELECT incidentRows → 0 rows
      (db.execute as Mock)
        .mockResolvedValueOnce([
          [{ id: 1, uuid: ROUTE_UUID, unit_id: 'PIIC-101', status: 'COMPLETED' }],
        ]) // routeRows
        .mockResolvedValueOnce([[]]); // incidentRows
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('SN-2: GET /routes/:uuid/node → 404 cuando ruta no existe', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]); // routeRows empty → 404
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('SN-3: GET /routes/:uuid/node → 403 scoped user fuera del owner', async (): Promise<void> => {
      // scoped token: permissions=['fleet:scoped','route:record:view:any']
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      // resolveOwnerScope → FleetService.getUserOwnerIds(2) → db.execute → [[{ id: 5 }]] → scope=[5]
      // checkRouteScope → db.execute → [[{ ownerId: 99 }]] → 99 not in [5] → false → 403
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }]]) // FleetService.getUserOwnerIds
        .mockResolvedValueOnce([[{ ownerId: 99 }]]); // checkRouteScope: route owner=99 not in [5]
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/node`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('SN-4: GET /incidents/:uuid/node → 200 con incidente (admin bypass)', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [{ id: 1, uuid: INC_UUID, category: 'MECANICA', severity: 'LOW' }],
      ]);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('SN-5: GET /incidents/:uuid/node → 404 cuando incidente no existe', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]); // rows empty → 404
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('SN-7: PUT /routes/:uuid → 403 FORBIDDEN scoped user fuera del owner (lines 635-638)', async (): Promise<void> => {
      const editToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:edit:any'],
      });
      // resolveOwnerScope: [[{ id: 5 }]] → scope=[5]
      // checkRouteScope: [[{ ownerId: 99 }]] → 99 not in [5] → false → 403
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }]]) // FleetService.getUserOwnerIds
        .mockResolvedValueOnce([[{ ownerId: 99 }]]); // checkRouteScope: route owner=99 not in [5]
      const response = await app.inject({
        method: 'PUT',
        url: `/v1/routes/${ROUTE_UUID}`,
        headers: { authorization: `Bearer ${editToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify({ data: { status: 'COMPLETED' }, reason: 'Correccion de estado' }),
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('SN-8: DELETE /routes/:uuid → 403 FORBIDDEN scoped user fuera del owner (lines 668-671)', async (): Promise<void> => {
      const deleteToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:delete:any'],
      });
      // resolveOwnerScope: [[{ id: 5 }]] → scope=[5]
      // checkRouteScope: [[{ ownerId: 99 }]] → 99 not in [5] → false → 403
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }]]) // FleetService.getUserOwnerIds
        .mockResolvedValueOnce([[{ ownerId: 99 }]]); // checkRouteScope: route owner=99 not in [5]
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/routes/${ROUTE_UUID}`,
        headers: { authorization: `Bearer ${deleteToken}`, 'content-type': 'application/json' },
        payload: JSON.stringify({ reason: 'Eliminacion justificada' }),
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('SN-6: GET /incidents/:uuid/node → 403 scoped user fuera del owner', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      // resolveOwnerScope → [[{ id: 5 }]] → scope=[5]
      // checkIncidentScope → [[{ ownerId: 99 }]] → 99 not in [5] → false → 403
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }]]) // FleetService.getUserOwnerIds
        .mockResolvedValueOnce([[{ ownerId: 99 }]]); // checkIncidentScope: incident owner=99 not in [5]
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
