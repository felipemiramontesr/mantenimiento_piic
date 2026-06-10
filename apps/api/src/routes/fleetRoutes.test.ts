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
});
