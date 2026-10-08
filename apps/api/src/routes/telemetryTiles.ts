import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import requireSession from '../middleware/requireSession';
import { outboundFetch } from '../services/outboundFetch';
import { resolveTileUpstream, tileParamsSchema } from '../services/mapTileUpstream';

/**
 * FC207 F1 (F-DEF1 · T2) — gateway soberano de mosaicos del mapa de Rastreo. El navegador pide cada
 * mosaico con su Bearer; el servidor lo trae del proveedor configurado en su entorno (la clave nunca
 * sale) por el guard A10, sin reenviar cookies ni credenciales del usuario.
 */

export const TILE_ROUTE_RATE_LIMIT = { max: 600, timeWindow: '1 minute' } as const;
export const TILE_CACHE_CONTROL = 'public, max-age=604800, immutable';
export const TILE_USER_AGENT = 'Archon-ERP/1.0 (+https://mantenimiento.piic.com.mx)';
const TILE_TIMEOUT_MS = 8_000;

/** Trae el PNG del proveedor; `null` si falla, tarda de más o no responde 2xx. */
async function fetchUpstreamTile(url: string): Promise<Buffer | null> {
  try {
    const res = await outboundFetch(url, {
      headers: { 'User-Agent': TILE_USER_AGENT, Accept: 'image/png' },
      timeoutMs: TILE_TIMEOUT_MS,
    });
    return res.ok ? await res.buffer() : null;
  } catch {
    return null; // sin registrar la URL: lleva la clave del proveedor
  }
}

/** GET /v1/telemetry/tiles/:z/:x/:y.png — filas 2–6 de T2 (la 1, sin sesión, es `requireSession`). */
export async function handleTile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const coords = tileParamsSchema.safeParse(request.params);
  if (!coords.success) {
    return reply
      .code(400)
      .send({ error: 'Coordenadas fuera de rango', code: 'COORDINATES_OUT_OF_BOUNDS' });
  }
  const upstream = resolveTileUpstream(process.env.MAP_TILES_UPSTREAM_URL, coords.data);
  if (!upstream.ok) {
    return reply.code(502).send({ error: 'Proveedor de mapas no disponible', code: upstream.code });
  }
  const tile = await fetchUpstreamTile(upstream.url);
  if (!tile) {
    return reply
      .code(502)
      .send({ error: 'Proveedor de mapas no disponible', code: 'TILE_UPSTREAM_ERROR' });
  }
  return reply
    .header('Content-Type', 'image/png')
    .header('Cache-Control', TILE_CACHE_CONTROL)
    .send(tile);
}

/**
 * Registro de la ruta con su cupo propio (600/min), aparte del global de 100/min. `index.ts` la monta
 * envuelta en el gate de capacidad RASTREO (`capabilityRoutes.ts`, FC193).
 */
export default function telemetryTilesRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);
  fastify.get(
    '/telemetry/tiles/:z/:x/:y.png',
    { config: { rateLimit: TILE_ROUTE_RATE_LIMIT } },
    handleTile
  );
  done();
}
