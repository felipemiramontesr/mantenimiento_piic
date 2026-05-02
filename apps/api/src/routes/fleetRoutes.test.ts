/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import RouteService from '../services/routeService';

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
  },
}));

describe('FleetRoutes Endpoints - Sovereign Dispatch', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/routes/start', () => {
    const validPayload = {
      unitId: 'UNIT-001',
      driverId: 1,
      startReading: 1000,
      destination: 'Sector 7',
    };

    it('should authorize journey start and return UUID', async () => {
      (RouteService.startRoute as Mock).mockResolvedValue('UUID-NEW');

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).routeUuid).toBe('UUID-NEW');
    });

    it('should return 400 if validation fails (Zod)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: { unitId: '' }, // Missing fields
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    it('should return 400 on service error', async () => {
      (RouteService.startRoute as Mock).mockRejectedValue(new Error('Unit busy'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Unit busy');
    });
  });

  describe('PATCH /v1/routes/:uuid/finish', () => {
    it('should complete route and release unit', async () => {
      (RouteService.finishRoute as Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/routes/UUID-123/finish',
        payload: { endReading: 1200 },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('should return 400 on completion error', async () => {
      (RouteService.finishRoute as Mock).mockRejectedValue(new Error('Invalid reading'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/routes/UUID-123/finish',
        payload: { endReading: 900 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Invalid reading');
    });
  });

  describe('GET /v1/routes/unit/:unitId/active', () => {
    it('should retrieve active journey for unit', async () => {
      (RouteService.getActiveRoute as Mock).mockResolvedValue({ uuid: 'ACT-1' });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).activeRoute.uuid).toBe('ACT-1');
    });

    it('should return 400 on retrieval error', async () => {
      (RouteService.getActiveRoute as Mock).mockRejectedValue(new Error('DB Error'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes/unit/UNIT-001/active',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/routes', () => {
    it('should list all journey history', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(2);
    });

    it('should return 400 on fetch error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('Fetch error'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/routes',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/unit-logs', () => {
    it('should provide full forensic journal', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 100 }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.length).toBe(1);
    });

    it('should return 400 on journal error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('Journal locked'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/unit-logs',
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Error fetching activity logs');
    });
  });
});
