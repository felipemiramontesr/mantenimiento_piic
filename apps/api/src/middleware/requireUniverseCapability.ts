import { FastifyReply, FastifyRequest } from 'fastify';
import { isClusterOf } from '@mantenimiento/contracts';
import type { ClusterCode, SuperclusterCode } from '@mantenimiento/contracts';
import { getUniverseCapabilities } from '../services/universeCapabilities.service';
import { isOmegaCaller } from './cosmonautMiddleware';

/**
 * FC193 F2 — Capability Gate (Invariantes 1 y 2; T1 de 373_AN).
 *
 * Preconditions: el `onRequest` de JWT del plugin ya corrió, así que `request.user` viene verificado.
 *
 *   Ω (`isOmegaCaller`)                          → pasa, sin tocar la DB (§24.10, único bypass)
 *   sin `tenant_id` válido (Arc itinerante/null) → 403 CAPABILITY_NOT_ACTIVE  (D3: null ≠ Ω)
 *   SC ACTIVE (y cluster ACTIVE si se exige)     → pasa
 *   SC/cluster SUSPENDED, REMOVED o ausente      → 403 CAPABILITY_NOT_ACTIVE
 *   sin usuario                                  → 401 UNAUTHORIZED
 *
 * Fail-closed: un error al leer las capacidades se propaga (5xx), jamás concede el paso.
 */
export interface CapabilityRequirement {
  supercluster: SuperclusterCode;
  cluster?: ClusterCode;
}

interface GateUser {
  id?: number;
  roleId?: number;
  permissions?: string[];
  tenant_id?: number | null;
}

/** El usuario verificado de la petición. Algunos plugins autentican DENTRO del handler (p. ej.
 *  `realtimeTelemetry`), así que en `preHandler` aún no hay `request.user`: entonces el gate verifica el
 *  JWT él mismo (idempotente; el handler lo vuelve a verificar sin efecto). Sin usuario verificado no
 *  hay decisión posible → undefined. */
async function resolveUser(request: FastifyRequest): Promise<GateUser | undefined> {
  if (!request.user) {
    try {
      await request.jwtVerify();
    } catch {
      return undefined;
    }
  }
  return request.user as GateUser | undefined;
}

function deny(reply: FastifyReply, supercluster: SuperclusterCode): void {
  reply.code(403).send({
    success: false,
    code: 'CAPABILITY_NOT_ACTIVE',
    message: `El módulo ${supercluster} no está activo en este universo`,
  });
}

/** Devuelve el preHandler. Un par (SC, cluster) que el manifiesto no reconoce falla al REGISTRAR
 *  la ruta (arranque), no en la primera petición. */
export function requireUniverseCapability(
  requirement: CapabilityRequirement
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const { supercluster, cluster } = requirement;
  if (cluster !== undefined && !isClusterOf(supercluster, cluster)) {
    throw new Error(
      `requireUniverseCapability: el cluster ${cluster} no pertenece a ${supercluster}`
    );
  }

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await resolveUser(request);
    // `typeof` y no `!user?.id`: un id 0 (legado de Archon, ver `telemetry.ts`) es un usuario válido.
    if (typeof user?.id !== 'number') {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'No autenticado' });
      return;
    }
    if (isOmegaCaller(user)) return;

    const tenantId = user.tenant_id;
    if (typeof tenantId !== 'number' || !Number.isInteger(tenantId) || tenantId <= 0) {
      deny(reply, supercluster);
      return;
    }

    const capabilities = await getUniverseCapabilities(tenantId);
    const active =
      capabilities.superclusters.has(supercluster) &&
      (cluster === undefined || capabilities.clusters.has(cluster));
    if (!active) deny(reply, supercluster);
  };
}
