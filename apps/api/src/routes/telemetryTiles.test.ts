import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import buildApp from '../index';
import { outboundFetch, type OutboundResponse } from '../services/outboundFetch';
import { TILE_CACHE_CONTROL, TILE_USER_AGENT } from './telemetryTiles';

/**
 * FC207 F1 (F-DEF1 · T2, 6 filas) — gateway de mosaicos `GET /v1/telemetry/tiles/:z/:x/:y.png`, con
 * la app real (sesión, cupo propio de 600/min) y el guard A10 sustituido por un doble.
 */

// El gate de capacidad RASTREO de esta ruta lo cubre capabilityRoutes.test.ts con la app real.
vi.mock('../middleware/requireUniverseCapability', () => ({
  requireUniverseCapability: () => async (): Promise<void> => undefined,
}));

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/outboundFetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/outboundFetch')>()),
  outboundFetch: vi.fn(),
}));

const UPSTREAM = 'https://tiles.example.com/tiles/dark/{z}/{x}/{y}.png?api_key=SECRET';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/** Respuesta del proveedor con el estado dado. */
function upstreamReply(status: number): OutboundResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {},
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    buffer: () => Promise.resolve(PNG),
  };
}

describe('FC207 F1 — gateway de mosaicos (T2)', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    token = jwt.sign({ id: 10, username: 'arc', roleId: 2, permissions: [] });
  });

  beforeEach(() => {
    vi.stubEnv('MAP_TILES_UPSTREAM_URL', UPSTREAM);
    vi.mocked(outboundFetch).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /** GET del mosaico con o sin sesión. */
  async function getTile(
    path: string,
    withSession = true
  ): Promise<Awaited<ReturnType<typeof app.inject>>> {
    return app.inject({
      method: 'GET',
      url: `/v1/telemetry/tiles/${path}`,
      headers: withSession ? { authorization: `Bearer ${token}` } : {},
    });
  }

  it('fila 1 — sin sesión: 401 y sin salir al proveedor', async () => {
    const res = await getTile('5/7/13.png', false);
    expect(res.statusCode).toBe(401);
    expect(outboundFetch).not.toHaveBeenCalled();
  });

  it.each([
    '20/0/0.png',
    '0/1/0.png',
    '0/0/1.png',
    '3/8/0.png',
    '3/0/-1.png',
    '3/a/0.png',
    '3/1.5/0.png',
  ])('fila 2 — coordenadas fuera de rango (%s): 400 COORDINATES_OUT_OF_BOUNDS', async (path) => {
    const res = await getTile(path);
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('COORDINATES_OUT_OF_BOUNDS');
    expect(outboundFetch).not.toHaveBeenCalled();
  });

  it('fila 3 — sin MAP_TILES_UPSTREAM_URL: 502 TILE_UPSTREAM_NOT_CONFIGURED', async () => {
    vi.stubEnv('MAP_TILES_UPSTREAM_URL', '');
    const res = await getTile('5/7/13.png');
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('TILE_UPSTREAM_NOT_CONFIGURED');
  });

  it('fila 4 — upstream no https: 502 TILE_UPSTREAM_INVALID_PROTOCOL sin fetch', async () => {
    vi.stubEnv('MAP_TILES_UPSTREAM_URL', 'http://tiles.example.com/{z}/{x}/{y}.png');
    const res = await getTile('5/7/13.png');
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('TILE_UPSTREAM_INVALID_PROTOCOL');
    expect(outboundFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['responde 5xx', (): Promise<OutboundResponse> => Promise.resolve(upstreamReply(503))],
    ['falla o vence', (): Promise<OutboundResponse> => Promise.reject(new Error('timeout'))],
  ])('fila 5 — el proveedor %s: 502 TILE_UPSTREAM_ERROR', async (_label, outcome) => {
    vi.mocked(outboundFetch).mockImplementation(outcome);
    const res = await getTile('5/7/13.png');
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('TILE_UPSTREAM_ERROR');
    expect(res.body).not.toContain('SECRET');
  });

  it('fila 6 — el proveedor responde: 200 PNG con caché inmutable de 7 días', async () => {
    vi.mocked(outboundFetch).mockResolvedValue(upstreamReply(200));
    const res = await getTile('5/7/13.png');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe(TILE_CACHE_CONTROL);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.rawPayload.equals(PNG)).toBe(true);
    expect(outboundFetch).toHaveBeenCalledWith(
      'https://tiles.example.com/tiles/dark/5/7/13.png?api_key=SECRET',
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': TILE_USER_AGENT }),
      })
    );
    const init = vi.mocked(outboundFetch).mock.calls[0][1];
    expect(JSON.stringify(init)).not.toMatch(/cookie|authorization/i);
  });

  it('cupo propio de 600/min: el mapa no consume el global de 100/min', async () => {
    vi.mocked(outboundFetch).mockResolvedValue(upstreamReply(200));
    const res = await getTile('0/0/0.png');
    expect(res.headers['x-ratelimit-limit']).toBe('600');
  });
});
