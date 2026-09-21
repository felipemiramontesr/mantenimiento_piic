import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { renameUniverse, type UniverseActor } from '../services/universeManagement.service';
import { labelFailureCode, universeLabelSchema } from '../services/universeLabel';

/**
 * FC192 — `PATCH /v1/cosmology/universes/:tenantId/label`. La ruta solo valida el request y mapea el
 * resultado a HTTP; el guard `requireOmega()` se declara en el registro (cosmology.ts) y la política de
 * mutación (`canMutateUniverse`) vive en el servicio (Cond.R-192 A1). Zero-SQL.
 */

const renameParamsSchema = z.object({ tenantId: z.coerce.number().int().positive() });
const renameBodySchema = z.object({ label: universeLabelSchema });

const LABEL_LENGTH_MESSAGE = 'El nombre debe tener entre 3 y 100 caracteres';

/** Renombra un universo (solo Ω hoy). 200 `{ success, universe: { id, code, label } }`. */
export default async function handleRenameUniverse(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = renameParamsSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const body = renameBodySchema.safeParse(request.body);
  if (!body.success) {
    const code = labelFailureCode(body.error);
    const isLabelFailure = code === 'INVALID_LABEL_LENGTH';
    return reply.code(400).send({
      success: false,
      code,
      message: isLabelFailure ? LABEL_LENGTH_MESSAGE : 'Solicitud inválida',
      ...(isLabelFailure ? { field: 'label' } : {}),
    });
  }
  const result = await renameUniverse(
    request.user as UniverseActor,
    params.data.tenantId,
    body.data.label
  );
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({ success: true, universe: result.universe });
}
