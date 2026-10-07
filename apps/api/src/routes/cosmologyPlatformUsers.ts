import { FastifyInstance, FastifyRequest, FastifyReply, RouteShorthandOptions } from 'fastify';
import { z } from 'zod';
import { resetUserMfa } from '../services/mfa.service';
import { linkExistingUserToUniverse } from '../services/universeDirectLink.service';
import {
  checkUniverseConfirmation,
  listPlatformUsers,
  PLATFORM_USERS_PAGE_SIZE_MAX,
} from '../services/platformUsers.service';

/**
 * FC204 F3 — sovereign platform-users console API (Ω only, under `/v1/cosmology`):
 *  - GET  /users                 every cosmonaut with its Universo; filter by Universo or itinerant.
 *  - POST /users/:id/mfa/reset   FC185 F2's reset, now behind the named-Universe confirmation.
 *  - POST /users/:id/link-universe  FC206 F1: link an existing itinerant user to a Universo.
 * T1 guard order: ¬O → 403 (the Ω guard, before any body is read) · ¬T ∨ ¬U → 400 · otherwise 200.
 */

const userIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

/** Shared by every sovereign action on a user (also `DELETE /v1/auth/users/:id`). */
export const confirmUniverseNameSchema = z.string().trim().min(1).max(255);

const resetMfaBodySchema = z.object({ confirmUniverseName: confirmUniverseNameSchema });

/** FC206 F1 — destination Universo, role (ARC unless asked; MU only on an empty anchor) and its exact name. */
const linkUniverseBodySchema = z.object({
  tenantId: z.coerce.number().int().positive(),
  role: z.enum(['ARC', 'MU']).default('ARC'),
  confirmUniverseName: confirmUniverseNameSchema,
});

const listQuerySchema = z.object({
  tenantId: z.union([z.literal('itinerant'), z.coerce.number().int().positive()]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(PLATFORM_USERS_PAGE_SIZE_MAX).default(25),
});

/** Ω's id from the verified session (audit trail of the reset). */
function callerId(request: FastifyRequest): number {
  return (request.user as { id: number }).id;
}

/** GET /users — one page of (user, Universo) rows plus `total`. */
async function handleListPlatformUsers(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const query = listQuerySchema.safeParse(request.query);
  if (!query.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await listPlatformUsers({
    scope: query.data.tenantId,
    search: query.data.q,
    page: query.data.page,
    pageSize: query.data.pageSize,
  });
  return reply.send({ success: true, data: result.data, total: result.total });
}

/** POST /users/:id/mfa/reset — FC185 F2: the only "I lost my authenticator" path (a user never
 *  resets their own MFA). FC204 F3: Ω must type the exact name of the user's Universo. */
async function handleResetUserMfa(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = userIdParamSchema.safeParse(request.params);
  const body = resetMfaBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const failure = await checkUniverseConfirmation(params.data.id, body.data.confirmUniverseName);
  if (failure) {
    return reply
      .code(failure.status)
      .send({ success: false, code: failure.code, message: failure.message });
  }
  const result = await resetUserMfa(params.data.id, callerId(request));
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({ success: true });
}

/** POST /users/:id/link-universe — FC206 F1 (T1): the candidate gates, the Universo, the exact name
 *  and the MU anchor are decided in `linkExistingUserToUniverse`; this handler only parses and maps. */
async function handleLinkUniverse(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = userIdParamSchema.safeParse(request.params);
  const body = linkUniverseBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await linkExistingUserToUniverse({
    userId: params.data.id,
    tenantId: body.data.tenantId,
    role: body.data.role,
    confirmUniverseName: body.data.confirmUniverseName,
    callerId: callerId(request),
  });
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({ success: true, role: result.role });
}

/** Registers the platform-users routes on the cosmology plugin, behind its Ω guard. */
export default function registerPlatformUserRoutes(
  fastify: FastifyInstance,
  omegaGuard: RouteShorthandOptions
): void {
  fastify.get('/users', omegaGuard, handleListPlatformUsers);
  fastify.post('/users/:id/mfa/reset', omegaGuard, handleResetUserMfa);
  fastify.post('/users/:id/link-universe', omegaGuard, handleLinkUniverse);
}
