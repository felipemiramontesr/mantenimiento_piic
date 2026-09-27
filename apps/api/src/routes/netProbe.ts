import { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * FC199 F1 — sonda TEMPORAL de red (Cond.R-199 P1: medir la IP real antes de fijar `trustProxy`).
 * Devuelve solo lo que el servidor ve de QUIEN la consulta: IP del socket, `request.ip` y las
 * cabeceras de proxy/CDN. Sin sesión, sin DB, sin datos de terceros. Se retira en esta misma fase,
 * una vez fijado `trustProxy` con la evidencia.
 */

/** Cabeceras cuyo valor interesa: las que un proxy o CDN usa para transportar la IP del cliente. */
const PROXY_HEADER = /forward|real-ip|client-ip|connecting-ip|true-client|hcdn|via/i;

export interface NetProbeView {
  ip: string;
  ips: string[] | null;
  socket: string | null;
  proxyHeaders: Record<string, string>;
  headerNames: string[];
}

/** Vista de red de una petición (pura: la ruta solo la serializa). */
export function netProbeView(request: FastifyRequest): NetProbeView {
  const proxyHeaders: Record<string, string> = {};
  Object.entries(request.headers).forEach(([name, value]) => {
    if (PROXY_HEADER.test(name) && value !== undefined) {
      proxyHeaders[name] = Array.isArray(value) ? value.join(', ') : value;
    }
  });
  return {
    ip: request.ip,
    ips: request.ips ?? null,
    socket: request.socket.remoteAddress ?? null,
    proxyHeaders,
    headerNames: Object.keys(request.headers).sort((a, b) => a.localeCompare(b)),
  };
}

/** `GET /v1/public/net-probe` — anónima, 10/min por IP; solo serializa `netProbeView`. */
export default async function netProbeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/net-probe',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request): Promise<NetProbeView> => netProbeView(request)
  );
}
