import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from './index';
import db from './services/db';

/**
 * Incidente DB-1045 (FC082, Alfa/Bravo P4) — /health no probaba la DB (ciego
 * a caídas de conexión). Cubre la sonda nueva /health/db (SELECT 1).
 */

vi.mock('./services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('GET /health/db', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 operational when SELECT 1 succeeds', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ '1': 1 }], undefined]);
    const res = await app.inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('operational');
    expect(typeof body.latencyMs).toBe('number');
    expect(db.execute).toHaveBeenCalledWith('SELECT 1');
  });

  it('503 down when the DB connection fails, without leaking the raw error to the client', async () => {
    (db.execute as Mock).mockRejectedValueOnce({
      message: "Access denied for user 'u701509674_Felipe'@'127.0.0.1' (using password: YES)",
      errno: 1045,
      code: 'ER_ACCESS_DENIED_ERROR',
      sqlState: '28000',
    });
    const res = await app.inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('down');
    expect(JSON.stringify(body)).not.toContain('u701509674_Felipe');
  });
});
