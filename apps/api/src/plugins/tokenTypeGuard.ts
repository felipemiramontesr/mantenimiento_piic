import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * FC195 F2 — guardia global del TIPO de token en el encabezado `Authorization`.
 *
 * `@fastify/jwt` acepta como válido cualquier JWT firmado por el servidor y lee primero el
 * encabezado, sin mirar su tipo. Sin esta guardia, los tokens que `/login` entrega con SOLO la
 * contraseña (el `mfaToken` del reto y el `setupToken` del enrolamiento obligatorio) servían en
 * cualquier ruta que solo llama `jwtVerify()`: p. ej. `/switch-tenant` emitía una sesión completa
 * sin segundo factor y `/mfa/setup` apagaba el TOTP ya confirmado. Eso anulaba D-Ω1 (Scenario 6).
 *
 * Regla, solo para el encabezado (la cookie de refresh la sigue leyendo `/refresh`):
 *  - `type: 'access'` (sesión completa, ya pasó el 2FA) → pasa.
 *  - `type: 'mfa_setup'` → pasa SOLO en las 4 rutas de enrolamiento.
 *  - cualquier token de reto (`scope`) o de otro tipo (`refresh`) → 401.
 *  - sin `type` ni `scope` → pasa (formato previo a los tipos; la ruta decide).
 * La firma y la expiración las sigue verificando cada ruta con `jwtVerify()`.
 */

const ENROLLMENT_ROUTES: ReadonlySet<string> = new Set([
  '/v1/auth/mfa/setup',
  '/v1/auth/mfa/confirm',
  '/v1/auth/mfa/email/setup',
  '/v1/auth/mfa/email/verify-setup',
]);

interface TokenClaims {
  type?: unknown;
  scope?: unknown;
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header || !/^Bearer\s/i.test(header)) return null;
  return header.slice(header.indexOf(' ') + 1).trim() || null;
}

/** ¿Este token puede autenticar esta ruta? Sin decodificar (token corrupto) decide la ruta. */
export function isTokenAllowed(claims: TokenClaims | null, routeUrl: string | undefined): boolean {
  if (!claims) return true;
  if (claims.scope !== undefined) return false;
  if (claims.type === undefined || claims.type === 'access') return true;
  return claims.type === 'mfa_setup' && routeUrl !== undefined && ENROLLMENT_ROUTES.has(routeUrl);
}

/** Claims sin verificar firma (solo para clasificar); `null` si el token está malformado. */
function decodeClaims(fastify: FastifyInstance, token: string): TokenClaims | null {
  try {
    return fastify.jwt.decode<TokenClaims>(token);
  } catch {
    return null;
  }
}

/** Registra la guardia como `onRequest` global: corre antes de cualquier handler o preHandler. */
export default function registerTokenTypeGuard(fastify: FastifyInstance): void {
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const token = bearerToken(request);
      if (!token) return;
      const claims = decodeClaims(fastify, token);
      if (isTokenAllowed(claims, request.routeOptions.url)) return;
      await reply.code(401).send({
        success: false,
        code: 'TOKEN_TYPE_NOT_ALLOWED',
        message: 'Este token no autoriza esta operación — inicia sesión de nuevo',
      });
    }
  );
}
