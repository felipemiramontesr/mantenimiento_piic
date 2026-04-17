import { describe, it, expect, beforeAll } from 'vitest';
import buildApp from '../index';

/**
 * 🔱 Archon Integration Test: Telemetry Routes
 * Implementation: 100% Path Coverage (Pillar 2 - v.17.0.0)
 */

describe('Telemetry Integration Endpoints', () => {
  const app = buildApp();
  let archonToken: string;
  let standardToken: string;

  beforeAll(async () => {
    await app.ready();
    // Generate Archon Clearance Token (id: 0)
    archonToken = await (
      app as unknown as { jwt: { sign: (p: object) => Promise<string> } }
    ).jwt.sign({ id: 0, email: 'archon@piic.mx' });

    // Generate Standard Token (id: 1)
    standardToken = await (
      app as unknown as { jwt: { sign: (p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'user@piic.mx' });
  });

  describe('GET /v1/telemetry', () => {
    it('should return telemetry data when authorized with Archon Clearance', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/archon/telemetry',
        headers: {
          Authorization: `Bearer ${archonToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.system).toBeDefined();
      expect(body.fleet.active_units).toBe(42);
    });

    it('should return 403 Forbidden when using standard clearance', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/archon/telemetry',
        headers: {
          Authorization: `Bearer ${standardToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 Unauthorized when no token is provided', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/archon/telemetry',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
