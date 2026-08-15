import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireOmega } from '../middleware/cosmonautMiddleware';
import * as CosmologyService from '../services/cosmology.service';
import type { MutationResult, ListResult } from '../services/cosmology.service';

/**
 * FC160 F1 — Cosmology Core Admin Endpoints (§24.5 `AUTORIDAD_Ω`).
 * Zero-SQL (I1): every route parses/validates, delegates to
 * `cosmology.service.ts`, and maps the result to HTTP. All 7 routes are
 * Ω-exclusive — no permission grant substitutes (Cond.R-160-F1-R2).
 */

/** Same declarative shape as FC159's `userAdminGuard` — onRequest jwtVerify (no
 *  try/catch, preserves the standard 401) + preHandler requireOmega(). */
const omegaGuard = {
  onRequest: async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();
  },
  preHandler: [requireOmega()],
};

function sendMutationResult(reply: FastifyReply, result: MutationResult): FastifyReply {
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({ success: true });
}

function sendListResult<T>(reply: FastifyReply, result: ListResult<T>): FastifyReply {
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({ success: true, data: result.data });
}

const tenantIdParamSchema = z.object({ tenantId: z.coerce.number().int().positive() });
const superclusterParamSchema = tenantIdParamSchema.extend({ superclusterCode: z.string().min(1) });
const clusterParamSchema = tenantIdParamSchema.extend({ clusterCode: z.string().min(1) });
const addSuperclusterBodySchema = z.object({ superclusterCode: z.string().min(1) });
const addClusterBodySchema = z.object({ clusterCode: z.string().min(1) });

function callerId(request: FastifyRequest): number {
  return (request.user as { id: number }).id;
}

async function handleAddSupercluster(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = tenantIdParamSchema.safeParse(request.params);
  const body = addSuperclusterBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await CosmologyService.addSupercluster(
    params.data.tenantId,
    body.data.superclusterCode,
    callerId(request)
  );
  return sendMutationResult(reply, result);
}

async function handleRemoveSupercluster(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = superclusterParamSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await CosmologyService.removeSupercluster(
    params.data.tenantId,
    params.data.superclusterCode,
    callerId(request)
  );
  return sendMutationResult(reply, result);
}

async function handleListSuperclusters(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = tenantIdParamSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await CosmologyService.listSuperclusters(params.data.tenantId);
  return sendListResult(reply, result);
}

async function handleAddCluster(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = tenantIdParamSchema.safeParse(request.params);
  const body = addClusterBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await CosmologyService.addCluster(
    params.data.tenantId,
    body.data.clusterCode,
    callerId(request)
  );
  return sendMutationResult(reply, result);
}

async function handleRemoveCluster(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = clusterParamSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const result = await CosmologyService.removeCluster(
    params.data.tenantId,
    params.data.clusterCode,
    callerId(request)
  );
  return sendMutationResult(reply, result);
}

async function handleListClusters(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = tenantIdParamSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const { superclusterCode } = request.query as { superclusterCode?: string };
  const result = await CosmologyService.listClusters(params.data.tenantId, superclusterCode);
  return sendListResult(reply, result);
}

/** Registers the 6 Fase-1 cosmology mutability endpoints, all Ω-exclusive. */
export default async function cosmologyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/universes/:tenantId/superclusters', omegaGuard, handleAddSupercluster);
  fastify.delete(
    '/universes/:tenantId/superclusters/:superclusterCode',
    omegaGuard,
    handleRemoveSupercluster
  );
  fastify.get('/universes/:tenantId/superclusters', omegaGuard, handleListSuperclusters);
  fastify.post('/universes/:tenantId/clusters', omegaGuard, handleAddCluster);
  fastify.delete('/universes/:tenantId/clusters/:clusterCode', omegaGuard, handleRemoveCluster);
  fastify.get('/universes/:tenantId/clusters', omegaGuard, handleListClusters);
}
