import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import requireSession from '../middleware/requireSession';
import { badRequest, callerId, handleSchema, sendResult } from './arcsialHttp';
import {
  getActor,
  getOwnActorCard,
  searchActors,
  updateActorProfile,
} from '../services/arcsialActors.service';
import changeActorHandle from '../services/arcsialActorHandle.service';
import { followActor, unfollowActor } from '../services/arcsialFollows.service';
import { createPost, deletePost, listFeed, listWall } from '../services/arcsialPosts.service';
import type { ArcsialError } from '../services/arcsialProfiles.service';

/**
 * FC210 F2 — API del núcleo social de Arcsial V2 (actores, seguimiento, publicaciones, muro, feed,
 * búsqueda y gobernanza del handle), toda bajo sesión. La emisión y el borrado viven en
 * `/social/actors/posts` (Adenda 1): las rutas legadas `/social/posts` siguen sobre `social_posts`. Clase BUILTIN (`/v1/social`). La lógica de T1/T2 vive en
 * los servicios; aquí solo se valida la forma de la entrada y se traduce el resultado a HTTP.
 */

const WALL_PAGE_MAX = 30;
const SEARCH_NAME_MIN = 3;
const SEARCH_NAME_MAX = 50;
const SEARCHES_PER_HOUR = 20;
const BIO_MAX = 500;
const AVATAR_URL_MAX = 2048;

const PROFILE_FIELDS = ['displayName', 'bio', 'avatarUrl', 'isSearchable'] as const;

const tenantIdSchema = z.number().int().positive();
const handleParamSchema = z.object({ handle: handleSchema });
const cursorQuerySchema = z.object({
  beforeId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(WALL_PAGE_MAX).default(WALL_PAGE_MAX),
});
const searchQuerySchema = z.object({ name: z.string() });
const handleBodySchema = z.object({ handle: handleSchema });
const universeBodySchema = z.object({ asUniverseTenantId: tenantIdSchema.optional() });
const httpsUrlSchema = z.string().url().startsWith('https://').max(AVATAR_URL_MAX);
const postBodySchema = z.object({
  contentText: z.string(),
  imageUrls: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'CONTACTS']).optional(),
  asUniverseTenantId: tenantIdSchema.optional(),
});
const postIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
const profileBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional(),
    bio: z.string().trim().max(BIO_MAX).nullable().optional(),
    avatarUrl: httpsUrlSchema.nullable().optional(),
    isSearchable: z.boolean().optional(),
    asUniverseTenantId: tenantIdSchema.optional(),
  })
  .strict()
  .refine((body) => PROFILE_FIELDS.some((field) => body[field] !== undefined));

type RateLimitCheck = ReturnType<FastifyInstance['createRateLimit']>;

/** Handle de la ruta ya normalizado, o `null` si no cumple el patrón. */
function handleParam(request: FastifyRequest): string | null {
  const params = handleParamSchema.safeParse(request.params);
  return params.success ? params.data.handle : null;
}

/** Rutas `/:handle` que solo necesitan la sesión y el handle. */
function actorHandler(
  act: (userId: number, handle: string) => Promise<({ ok: true } & object) | ArcsialError>,
  okStatus = 200
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const handle = handleParam(request);
    if (handle === null) return badRequest(reply);
    return sendResult(reply, await act(callerId(request), handle), okStatus);
  };
}

/** GET /social/actors/:handle/posts — muro del actor, paginado por cursor. */
async function handleWall(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const handle = handleParam(request);
  const cursor = cursorQuerySchema.safeParse(request.query);
  if (handle === null || !cursor.success) return badRequest(reply);
  return sendResult(reply, await listWall(callerId(request), handle, cursor.data));
}

/** FC212 F1 — GET /social/actors/me: nombre, handle y avatar del actor propio, para el menú. */
async function handleOwnActor(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  return sendResult(reply, await getOwnActorCard(callerId(request)));
}

/** GET /social/feed — feed de la sesión, paginado por cursor. */
async function handleFeed(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const cursor = cursorQuerySchema.safeParse(request.query);
  if (!cursor.success) return badRequest(reply);
  return sendResult(reply, await listFeed(callerId(request), cursor.data));
}

/** Código del rechazo de una consulta de búsqueda, en el orden de T2: Q (`@`) → N (longitud). */
function searchRejection(name: string): string | null {
  if (name.includes('@')) return 'INVALID_SEARCH_QUERY';
  if (name.length < SEARCH_NAME_MIN) return 'QUERY_TOO_SHORT';
  return name.length > SEARCH_NAME_MAX ? 'VALIDATION_ERROR' : null;
}

/** GET /social/users/search?name= — la cuota (R) solo se consume con una consulta válida. */
function searchHandler(checkQuota: RateLimitCheck) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const query = searchQuerySchema.safeParse(request.query);
    if (!query.success) return badRequest(reply);
    const name = query.data.name.trim();
    const rejection = searchRejection(name);
    if (rejection) return badRequest(reply, rejection);
    const quota = await checkQuota(request);
    if (!quota.isAllowed && quota.isExceeded) {
      return reply.code(429).send({ success: false, code: 'RATE_LIMIT_EXCEEDED' });
    }
    return sendResult(reply, await searchActors(callerId(request), name));
  };
}

/** PATCH /social/actors/handle y /social/profile/handle — formato inválido ⇒ INVALID_HANDLE_FORMAT. */
async function handleChangeHandle(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const handle = handleBodySchema.safeParse(request.body);
  if (!handle.success) return badRequest(reply, 'INVALID_HANDLE_FORMAT');
  const universe = universeBodySchema.safeParse(request.body);
  if (!universe.success) return badRequest(reply);
  return sendResult(
    reply,
    await changeActorHandle(callerId(request), handle.data.handle, universe.data.asUniverseTenantId)
  );
}

/**
 * POST /social/actors/posts (Adenda 1) — aquí solo se valida la forma; el orden de T1 (MU → PII →
 * longitud e imágenes) lo aplica el servicio.
 */
async function handleCreatePost(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const body = postBodySchema.safeParse(request.body);
  if (!body.success) return badRequest(reply);
  return sendResult(reply, await createPost(callerId(request), body.data), 201);
}

/** DELETE /social/actors/posts/:id (Adenda 1). */
async function handleDeletePost(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = postIdParamSchema.safeParse(request.params);
  if (!params.success) return badRequest(reply);
  return sendResult(reply, await deletePost(callerId(request), params.data.id));
}

/** PATCH /social/actors/profile — sin id de actor: el propio, o el del Universo indicado. */
async function handleUpdateProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const body = profileBodySchema.safeParse(request.body);
  if (!body.success) return badRequest(reply);
  const { asUniverseTenantId, ...patch } = body.data;
  return sendResult(reply, await updateActorProfile(callerId(request), patch, asUniverseTenantId));
}

/** Cuota de búsquedas por hora y por sesión (en desarrollo y pruebas no estorba). */
function searchQuota(fastify: FastifyInstance): RateLimitCheck {
  return fastify.createRateLimit({
    max: () => (process.env.NODE_ENV === 'production' ? SEARCHES_PER_HOUR : 1000),
    timeWindow: '1 hour',
    keyGenerator: (request) => `arcsial-search:${callerId(request)}`,
  });
}

/** Registro de las rutas del núcleo social de Arcsial V2 (FC210 F2). */
export default function arcsialActorRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);
  // Ruta estática: Fastify la prefiere a `/:handle`, y «me» no cumple el patrón de handle (3–30).
  fastify.get('/social/actors/me', handleOwnActor);
  fastify.get('/social/actors/:handle', actorHandler(getActor));
  fastify.get('/social/actors/:handle/posts', handleWall);
  fastify.post('/social/actors/:handle/follow', actorHandler(followActor, 201));
  fastify.delete('/social/actors/:handle/follow', actorHandler(unfollowActor));
  fastify.get('/social/feed', handleFeed);
  fastify.get('/social/users/search', searchHandler(searchQuota(fastify)));
  fastify.patch('/social/actors/handle', handleChangeHandle);
  fastify.patch('/social/profile/handle', handleChangeHandle);
  fastify.patch('/social/actors/profile', handleUpdateProfile);
  fastify.post('/social/actors/posts', handleCreatePost);
  fastify.delete('/social/actors/posts/:id', handleDeletePost);
  done();
}
