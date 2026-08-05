import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import RouteService from '../services/routeService';
import NotificationService from '../services/notification.service';
import { CatalogMappingError } from '../services/catalogMapper';

// 🔱 Nucleus Mocks
// FC126 F1 — routes/fleetRoutes.ts is now zero-SQL (I1): it never imports
// '../services/db' anymore, so this suite no longer mocks it. Ownership-scope
// resolution (resolveOwnerScope/checkRouteScope/checkIncidentScope/
// checkUnitScope) and the former inline queries (/routes, /unit-logs, node
// views) all moved into RouteService (Cond.R-126-S1) — mocked here directly
// instead of simulating the db.execute call sequences that used to back them.
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
    updateRoute: vi.fn(),
    deleteRoute: vi.fn(),
    resolveOwnerScope: vi.fn(),
    checkRouteScope: vi.fn(),
    checkIncidentScope: vi.fn(),
    checkUnitScope: vi.fn(),
    listRoutes: vi.fn(),
    listUnitActivityLogs: vi.fn(),
    getRouteNode: vi.fn(),
    getIncidentNode: vi.fn(),
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
    // Ω bypass default (admin `token` above has permissions:['*']) — mirrors
    // T2 prescrita (127_AN): Ω sees everything, scope checks trivially pass.
    // Scoped-token tests below override these per-scenario.
    (RouteService.resolveOwnerScope as Mock).mockResolvedValue(null);
    (RouteService.checkRouteScope as Mock).mockResolvedValue(true);
    (RouteService.checkIncidentScope as Mock).mockResolvedValue(true);
    (RouteService.checkUnitScope as Mock).mockResolvedValue(true);
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

    it('should return 403 when unit is outside scoped owners', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:record:create'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkUnitScope as Mock).mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: validPayload,
        headers: { authorization: `Bearer ${scopedToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
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
      (RouteService.listRoutes as Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(2);
    });

    it('should return 400 on fetch error', async (): Promise<void> => {
      (RouteService.listRoutes as Mock).mockRejectedValue(new Error('Fetch error'));

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
      (RouteService.listUnitActivityLogs as Mock).mockResolvedValue([{ id: 100 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(1);
    });

    it('should return 400 on journal error', async (): Promise<void> => {
      (RouteService.listUnitActivityLogs as Mock).mockRejectedValue(new Error('Journal locked'));

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

    // FC 082 F2b2 — Cond.C: shape unificado 400/VALIDATION_ERROR cuando el
    // mapper de catálogo falla (fail-closed, propagado desde routeService.ts).
    it('POST /v1/routes/:uuid/incidents returns 400 VALIDATION_ERROR when category is not catalogued (CatalogMappingError)', async (): Promise<void> => {
      (RouteService.reportIncident as Mock).mockRejectedValue(
        new CatalogMappingError('INCIDENT_CATEGORY', 'MECANICA')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/UUID-123/incidents',
        payload: { category: 'MECANICA', description: 'Falla de prueba', severity: 'LOW' },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.field).toBe('category');
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
      // resolveOwnerScope: token has '*' → null (beforeEach default); checkRouteScope → true (default)
      (RouteService.getRouteNode as Mock).mockResolvedValue({
        route: { id: 1, uuid: ROUTE_UUID, unit_id: 'PIIC-101', status: 'COMPLETED' },
        incidents: [],
      });
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('SN-2: GET /routes/:uuid/node → 404 cuando ruta no existe', async (): Promise<void> => {
      (RouteService.getRouteNode as Mock).mockResolvedValue(null);
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
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/node`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('SN-4: GET /incidents/:uuid/node → 200 con incidente (admin bypass)', async (): Promise<void> => {
      (RouteService.getIncidentNode as Mock).mockResolvedValue({
        id: 1,
        uuid: INC_UUID,
        category: 'MECANICA',
        severity: 'LOW',
      });
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('SN-5: GET /incidents/:uuid/node → 404 cuando incidente no existe', async (): Promise<void> => {
      (RouteService.getIncidentNode as Mock).mockResolvedValue(null);
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
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:record:edit:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
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
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:record:delete:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
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
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkIncidentScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('SN-9: GET /routes/:uuid/incidents → 403 scoped user fuera del owner (lines 595-598)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${ROUTE_UUID}/incidents`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('SN-10: GET /incidents → 200 empty when scoped user has no owners (lines 614-615)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      // resolveOwnerScope → [] (fleet:scoped carrier with 0 owned units) → route
      // short-circuits before calling RouteService.getAllIncidents at all.
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/incidents',
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data).toEqual([]);
      expect(RouteService.getAllIncidents).not.toHaveBeenCalled();
    });
  });

  describe('Branch Coverage — checkRouteScope / checkIncidentScope + scope paths', () => {
    const CHK_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const INC_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

    it('BC-1: GET /routes/:uuid/checkpoints → 403 route not in DB (checkRouteScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-2: GET /incidents/:uuid/node → 403 incident not in DB (checkIncidentScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkIncidentScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/incidents/${INC_UUID}/node`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-3: GET /routes/unit/:unitId/active → 200 scoped user in-scope (checkUnitScope true)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkUnitScope as Mock).mockResolvedValue(true);
      (RouteService.getActiveRoute as Mock).mockResolvedValue(null);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('BC-3b: GET /routes/unit/:unitId/active → 403 unit found but ownerId NOT in scope', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkUnitScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-4: GET /unit-logs → 200 scoped non-empty scope delegates to RouteService', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.listUnitActivityLogs as Mock).mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data).toEqual([]);
      expect(RouteService.listUnitActivityLogs).toHaveBeenCalledWith([5]);
    });

    it('BC-4b: GET /unit-logs → 200 scoped empty ownerIds (empty scope array, no owned units)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([]);
      (RouteService.listUnitActivityLogs as Mock).mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data).toEqual([]);
      expect(RouteService.listUnitActivityLogs).toHaveBeenCalledWith([]);
    });

    it('BC-5: POST /routes/:uuid/checkpoints → 403 scoped user (checkRouteScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:waypoint:manage'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'POST',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        payload: { sequence: 1, name: 'PuntoA' },
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-6: POST /routes/:uuid/checkpoints → 400 generic error in catch (Duplicate-entry false path)', async (): Promise<void> => {
      // admin → access=true; addCheckpoint throws generic error → msg≠route-not-found, msg≠Duplicate → 400
      (RouteService.addCheckpoint as Mock).mockRejectedValue(new Error('DB connection lost'));
      const response = await app.inject({
        method: 'POST',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        payload: { sequence: 1, name: 'PuntoA' },
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    it('BC-7: GET /routes/:uuid/checkpoints → 403 scoped user (checkRouteScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-8: GET /routes/:uuid/checkpoints → 400 generic error in catch (msg≠route-not-found fallthrough)', async (): Promise<void> => {
      // admin → access=true; getCheckpoints throws generic error → msg≠route-not-found → 400
      (RouteService.getCheckpoints as Mock).mockRejectedValue(new Error('DB connection lost'));
      const response = await app.inject({
        method: 'GET',
        url: `/v1/routes/${CHK_UUID}/checkpoints`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    it('BC-9: PATCH /routes/:uuid/checkpoints/:id/arrive → 403 scoped user (checkRouteScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:waypoint:manage'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/routes/${CHK_UUID}/checkpoints/1/arrive`,
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });

    it('BC-10: PATCH /routes/:uuid/checkpoints/:id/arrive → 404 when route not found (catch block)', async (): Promise<void> => {
      // admin → access=true; arriveAtCheckpoint throws Route not found → catch entered → 404
      (RouteService.arriveAtCheckpoint as Mock).mockRejectedValue(new Error('Route not found'));
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/routes/${CHK_UUID}/checkpoints/1/arrive`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).code).toBe('NOT_FOUND');
    });

    it('BC-10b: PATCH /routes/:uuid/checkpoints/:id/arrive → 400 generic error (else-path)', async (): Promise<void> => {
      // admin → access=true; arriveAtCheckpoint throws generic error (not Route not found)
      // → if(msg==='Route not found') false → if(msg.includes('not found or already visited')) false → 400
      (RouteService.arriveAtCheckpoint as Mock).mockRejectedValue(new Error('DB connection lost'));
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/routes/${CHK_UUID}/checkpoints/1/arrive`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    it('BC-10c: PATCH /routes/:uuid/checkpoints/:id/arrive → 404 checkpoint not found or already visited', async (): Promise<void> => {
      // admin → access=true; arriveAtCheckpoint throws 'checkpoint not found or already visited'
      // → if(msg==='Route not found') false → if(msg.includes('not found or already visited')) true → 404
      (RouteService.arriveAtCheckpoint as Mock).mockRejectedValue(
        new Error('checkpoint not found or already visited')
      );
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/routes/${CHK_UUID}/checkpoints/1/arrive`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).code).toBe('NOT_FOUND');
    });

    it('BC-11: POST /routes/:uuid/incidents → 403 scoped user (checkRouteScope false)', async (): Promise<void> => {
      const scopedToken = app.jwt.sign({
        id: 2,
        permissions: ['fleet:scoped', 'route:record:view:any', 'route:record:edit:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([5]);
      (RouteService.checkRouteScope as Mock).mockResolvedValue(false);
      const response = await app.inject({
        method: 'POST',
        url: `/v1/routes/${CHK_UUID}/incidents`,
        payload: { category: 'MECANICA', description: 'Falla en motor', severity: 'LOW' },
        headers: { authorization: `Bearer ${scopedToken}` },
      });
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).code).toBe('FORBIDDEN');
    });
  });

  describe('FC126 F1 — resolveOwnerScope (Cond.R-126-S3 BOLA tests)', () => {
    it('grants unrestricted access (null) to Ω (permissions includes *)', async (): Promise<void> => {
      (RouteService.listRoutes as Mock).mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(RouteService.resolveOwnerScope).toHaveBeenCalled();
    });

    it('restricts a non-Ω carrier without fleet:scoped to their own tenant, not global (T2 prescrita)', async (): Promise<void> => {
      // FC126 F1 BOLA fix (127_AN Bravo): before this fix, a non-Ω actor
      // without fleet:scoped saw everything (ownerScope=null). Now they are
      // restricted to [tenant_id] — never unrestricted by default.
      const tenantToken = app.jwt.sign({
        id: 3,
        tenant_id: 42,
        permissions: ['route:record:view:any'],
      });
      (RouteService.resolveOwnerScope as Mock).mockResolvedValue([42]);
      (RouteService.listRoutes as Mock).mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: { authorization: `Bearer ${tenantToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(RouteService.listRoutes).toHaveBeenCalledWith([42]);
    });
  });
});
