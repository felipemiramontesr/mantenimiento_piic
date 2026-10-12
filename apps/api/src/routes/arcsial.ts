import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import requireSession from '../middleware/requireSession';
import { badRequest, callerId, handleSchema, sendResult } from './arcsialHttp';
import {
  getOwnProfile,
  listOwnBlocks,
  listOwnContacts,
  lookupByHandle,
} from '../services/arcsialProfiles.service';
import { issueInvitation, listInvitations } from '../services/arcsialInvitations.service';
import { acceptInvitation, blockUser, closeInvitation } from '../services/arcsialResponses.service';
import type { ArcsialError } from '../services/arcsialProfiles.service';

/**
 * FC209 F2 — API de Arcsial (contactos e invitaciones), toda bajo sesión. Clase BUILTIN (`/v1/social`):
 * no depende de ningún Supercúmulo. El handle se valida con `handleSchema` (`arcsialHttp.ts`). El cambio
 * de handle (`PATCH /social/profile/handle`) vive desde FC210 F2 en `arcsialActors.ts`.
 */

const lookupQuerySchema = z.object({ handle: handleSchema });
const inviteBodySchema = z.object({
  recipientHandle: handleSchema,
  inviteType: z.enum(['CONTACT', 'UNIVERSE']),
});
const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const userIdParamSchema = z.object({ userId: z.coerce.number().int().positive() });

/** GET /social/users/lookup?handle= — handle exacto; inexistente o bloqueado ⇒ 404 opaco. */
async function handleLookup(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const query = lookupQuerySchema.safeParse(request.query);
  if (!query.success) return badRequest(reply);
  return sendResult(reply, await lookupByHandle(callerId(request), query.data.handle));
}

/** GET /social/profile, /social/contacts y /social/blocks (FC209 F3): lecturas propias. */
function ownReadHandler(read: (userId: number) => Promise<({ ok: true } & object) | ArcsialError>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> =>
    sendResult(reply, await read(callerId(request)));
}

/** POST /social/invitations — 201 con el token en claro solo para el emisor. */
async function handleIssue(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const body = inviteBodySchema.safeParse(request.body);
  if (!body.success) return badRequest(reply);
  const { recipientHandle, inviteType } = body.data;
  return sendResult(
    reply,
    await issueInvitation(callerId(request), recipientHandle, inviteType),
    201
  );
}

/** GET /social/invitations — recibidas y enviadas, con la caducidad pasiva aplicada. */
async function handleList(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  return reply.send({ success: true, data: await listInvitations(callerId(request)) });
}

/** POST /social/invitations/:id/accept. */
async function handleAccept(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const params = idParamSchema.safeParse(request.params);
  if (!params.success) return badRequest(reply);
  return sendResult(reply, await acceptInvitation(callerId(request), params.data.id));
}

/** POST /social/invitations/:id/reject y /cancel. */
function closeHandler(action: 'REJECT' | 'CANCEL') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply);
    return sendResult(reply, await closeInvitation(callerId(request), params.data.id, action));
  };
}

/** POST /social/blocks/:userId. */
async function handleBlock(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const params = userIdParamSchema.safeParse(request.params);
  if (!params.success) return badRequest(reply);
  return sendResult(reply, await blockUser(callerId(request), params.data.userId));
}

/** Registro de las rutas de Arcsial (FC209 F2). */
export default function arcsialRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);
  fastify.get('/social/users/lookup', handleLookup);
  fastify.get('/social/profile', ownReadHandler(getOwnProfile));
  fastify.get('/social/contacts', ownReadHandler(listOwnContacts));
  fastify.get('/social/blocks', ownReadHandler(listOwnBlocks));
  fastify.get('/social/invitations', handleList);
  fastify.post('/social/invitations', handleIssue);
  fastify.post('/social/invitations/:id/accept', handleAccept);
  fastify.post('/social/invitations/:id/reject', closeHandler('REJECT'));
  fastify.post('/social/invitations/:id/cancel', closeHandler('CANCEL'));
  fastify.post('/social/blocks/:userId', handleBlock);
  done();
}
