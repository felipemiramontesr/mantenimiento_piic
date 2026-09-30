import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isIpDenied } from '../services/securityDenylist.service';
import { isTokenAllowed } from './tokenTypeGuard';

/**
 * FC201 F3 · T1.3 — bloqueo perimetral manual de Ω:
 *   BLOCK_403 ≡ DENIED ∧ ¬AUTH_HEADER ∧ ¬AUTH_ROUTE ∧ ANON_SURFACE
 * Una IP bloqueada solo pierde la superficie anónima: con una sesión válida pasa (inmunidad CGNAT,
 * Inv-3) y login, refresh, MFA y el reto PoW NUNCA se bloquean (P5, P7), para que nadie quede
 * fuera de su propia cuenta por compartir red con un atacante.
 */

const AUTH_ROUTES: ReadonlySet<string> = new Set([
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/v1/public/bot-challenge',
]);
const AUTH_PREFIXES: readonly string[] = ['/v1/auth/mfa/'];

/** P5 · P7 — rutas de autenticación y del reto anti-bot, exentas de cualquier bloqueo manual. */
export function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.has(path) || AUTH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** ¿La petición trae una sesión de acceso válida (firma verificada, no un token de alcance MFA)? */
async function hasValidSession(request: FastifyRequest): Promise<boolean> {
  try {
    const claims = await request.jwtVerify<{ type?: unknown; scope?: unknown }>();
    return isTokenAllowed(claims, undefined);
  } catch {
    return false;
  }
}

/** Registra el guard como `onRequest` global (lista en memoria; sin DB por petición). */
export default function registerManualDenylistGuard(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    if (isAuthRoute(path) || !isIpDenied(request.ip)) return;
    if (await hasValidSession(request)) return;
    await reply.code(403).send({ error: 'Forbidden' });
  });
}
