import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import { z } from 'zod';
import { userUpdateSchema } from '@mantenimiento/contracts';
import requirePermission from '../middleware/requirePermission';
import { MultiMembershipHaltError } from '../middleware/cosmonautMiddleware';
import * as SessionService from '../services/authSession.service';
import * as UserManagementService from '../services/authUserManagement.service';
import { ScopedUser } from '../services/ownerScopeResolver';

/**
 * 🔱 Archon Auth Engine (v.8.7.0) - THE NUCLEUS
 * FC130 F1 — zero-SQL (I1): toda persistencia delega a authSession.service.ts /
 * authUserManagement.service.ts / cosmonautMiddleware.ts. Esta ruta solo
 * parsea request, llama al service y formatea la respuesta HTTP (firma JWT +
 * cookies incluida — Cond.R-130-E4, adapters explícitos fuera del service).
 */

/** FC 082 F3b Cond.1 (Bravo) — respuesta uniforme para R2a: nunca elegir tenant en
 *  silencio cuando un usuario tiene >1 fila en tenant_user_memberships. HALT + log
 *  forense, requiere resolución manual de Ω (sin producto de "multi-home" aún).
 */
function haltMultiMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  error: MultiMembershipHaltError
): FastifyReply {
  request.log.error({ userId: error.userId, tenantIds: error.tenantIds }, error.message);
  return reply.code(409).send({
    success: false,
    code: 'MULTI_TENANT_MEMBERSHIP_UNRESOLVED',
    message: 'Se detectaron múltiples Universos para este usuario — requiere resolución manual',
  });
}

function refreshCookieOpts(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  domain: string | undefined;
  path: string;
  maxAge: number;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    domain: isProduction ? '.piic.com.mx' : undefined,
    path: '/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  };
}

async function handleLogin(
  request: FastifyRequest<{ Body: { username?: string; password?: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { username, password } = request.body;
  if (!username) {
    return reply.code(400).send({ error: 'L1' });
  }
  if (!password) {
    return reply.code(400).send({ error: 'L2' });
  }
  try {
    const result = await SessionService.login(username, password);
    if (!result.ok) {
      return reply.code(401).send({ error: result.errorCode });
    }
    const { mapped, tenantId, permissions, ownerType, availableTenants } = result;
    const token = request.server.jwt.sign({
      id: result.userId,
      username: result.username,
      roleId: mapped.roleId,
      roleName: mapped.roleName,
      permissions,
      type: 'access',
      tenant_id: tenantId,
      owner_type: ownerType,
    });
    const refreshToken = request.server.jwt.sign(
      { id: result.userId, type: 'refresh', tenant_id: tenantId },
      { expiresIn: '7d' }
    );
    return reply.setCookie('refresh_token', refreshToken, refreshCookieOpts()).send({
      success: true,
      token,
      user: { ...mapped, permissions, ownerType, tenantId, availableTenants },
    });
  } catch (e) {
    if (e instanceof MultiMembershipHaltError) {
      return haltMultiMembership(request, reply, e);
    }
    request.log.error(e);
    return reply.code(500).send({ error: 'LOGIN_FAIL' });
  }
}

async function handleRefresh(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  try {
    const decoded = await request.jwtVerify<{
      id: number;
      type: string;
      tenant_id?: number | null;
    }>();
    if (!decoded || decoded.type !== 'refresh') {
      return reply.code(401).send({ error: 'INVALID_TOKEN_TYPE' });
    }
    const result = await SessionService.refresh(decoded.id, decoded.tenant_id);
    if (!result.ok) {
      return reply.code(401).send({ error: result.errorCode });
    }
    const { mapped, tenantId, permissions, ownerType, availableTenants } = result;
    const accessToken = request.server.jwt.sign({
      id: result.userId,
      username: result.username,
      roleId: mapped.roleId,
      roleName: mapped.roleName,
      permissions,
      type: 'access',
      tenant_id: tenantId,
      owner_type: ownerType,
    });
    return reply.send({
      success: true,
      token: accessToken,
      user: { ...mapped, permissions, ownerType, tenantId, availableTenants },
    });
  } catch (e) {
    if (e instanceof MultiMembershipHaltError) {
      return haltMultiMembership(request, reply, e);
    }
    // Incidente DB-1045 P3 (Alfa/Bravo) — error boundary: un token ausente/
    // expirado/inválido (@fastify/jwt siempre marca statusCode=401) sigue
    // siendo 401 REFRESH_FAIL sin ensuciar logs. Cualquier OTRO error (DB,
    // sistema) ya no se disfraza de fallo de sesión — se loguea completo y
    // responde 500, para no confundir una caída de infraestructura con un
    // logout legítimo.
    const err = e as { statusCode?: number; code?: string };
    if (err.statusCode === 401 || err.code?.startsWith('FST_JWT_')) {
      return reply.code(401).send({ error: 'REFRESH_FAIL' });
    }
    request.log.error({ route: '/refresh', err: e }, 'Refresh failed — system error');
    return reply
      .code(500)
      .send({ success: false, code: 'INTERNAL_ERROR', message: 'REFRESH_FAIL' });
  }
}

async function handleSwitchTenant(
  request: FastifyRequest<{ Body: { tenantId?: number } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  // jwtVerify fuera del try/catch: un token ausente/inválido debe serializar
  // como 401 vía el error handler global (index.ts — "jwt 401 untouched"),
  // no como 500 genérico.
  await request.jwtVerify();
  try {
    const caller = request.user as { id: number; roleId: number };
    const result = await SessionService.switchTenant(
      caller.id,
      caller.roleId,
      request.body?.tenantId
    );
    if (!result.ok) {
      return reply.code(result.status).send({
        success: false,
        code: result.code,
        ...(result.message ? { message: result.message } : {}),
      });
    }
    const { mapped, tenantId, permissions, ownerType, availableTenants } = result;
    const token = request.server.jwt.sign({
      id: result.userId,
      username: result.username,
      roleId: mapped.roleId,
      roleName: mapped.roleName,
      permissions,
      type: 'access',
      tenant_id: tenantId,
      owner_type: ownerType,
    });
    const refreshToken = request.server.jwt.sign(
      { id: result.userId, type: 'refresh', tenant_id: tenantId },
      { expiresIn: '7d' }
    );
    // R2b (Bravo) — reemitir la cookie con los MISMOS atributos que /login,
    // si no la cookie vieja sin tenant_id gana en el próximo /refresh.
    return reply.setCookie('refresh_token', refreshToken, refreshCookieOpts()).send({
      success: true,
      token,
      user: { ...mapped, permissions, ownerType, tenantId, availableTenants },
    });
  } catch (e) {
    request.log.error({ route: '/switch-tenant', err: e }, 'Switch-tenant failed');
    return reply.code(500).send({ success: false, code: 'INTERNAL_ERROR' });
  }
}

async function handleLogout(_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const isProduction = process.env.NODE_ENV === 'production';
  return reply
    .clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      domain: isProduction ? '.piic.com.mx' : undefined,
      path: '/v1/auth',
    })
    .send({ success: true });
}

async function handleGetUsers(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const { role } = request.query as { role?: string };
  try {
    const ownerScope = await UserManagementService.resolveOwnerScope(request.user as ScopedUser);
    const data = await UserManagementService.listUsers(ownerScope, role);
    return reply.send({ success: true, data });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ error: 'USER_FAIL' });
  }
}

async function handlePatchUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  // FC 076 F4 — schema movido a packages/contracts (SSOT compartido con
  // apps/web); importado 1:1, cero cambio semántico (Cond.1 Bravo).
  const { id } = request.params as { id: string };
  const body = userUpdateSchema.safeParse(request.body);
  if (!body.success) {
    return reply.code(400).send({ error: 'U1', details: body.error.format() });
  }
  const { data: updates, reason } = body.data;
  const admin = request.user as ScopedUser & { roleId?: number };
  // ?? [] inalcanzable: userAdminGuard exige permissions array antes de llegar aquí (lanzaría 500 si no).
  /* v8 ignore next */
  const adminIsOmega = admin.roleId === 0 || (admin.permissions ?? []).includes('*');
  const roleIdError = UserManagementService.validateRoleIdUpdate(updates.roleId, adminIsOmega);
  if (roleIdError) {
    return reply
      .code(roleIdError.status)
      .send({ success: false, code: roleIdError.code, message: roleIdError.message });
  }
  try {
    const result = await UserManagementService.updateUser(id, updates, reason, admin);
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.code });
    }
    return reply.send({ success: true });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ error: 'UPDATE_FAIL' });
  }
}

async function handleDeleteUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  const parse = z.object({ reason: z.string().min(5) }).safeParse(request.body);
  if (!parse.success) {
    return reply.code(400).send({ error: 'D1', details: parse.error.format() });
  }
  const { reason } = parse.data;
  await request.jwtVerify();
  const admin = request.user as ScopedUser & { roleId?: number };
  // FC159 R3b — enmienda de Ω: borrar usuarios es exclusivo de Ω en este estado del
  // sistema, no delegable vía `user:admin` (mismo idioma que handlePatchUser/
  // validateRoleIdUpdate para roleId=0, no un tercer criterio nuevo).
  const adminIsOmega = admin.roleId === 0 || (admin.permissions ?? []).includes('*');
  if (!adminIsOmega) {
    return reply
      .code(403)
      .send({ success: false, code: 'FORBIDDEN', message: 'Solo Ω puede eliminar usuarios' });
  }
  try {
    const result = await UserManagementService.deleteUser(id, reason, admin);
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.code });
    }
    return reply.send({ success: true });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ error: 'DELETE_FAIL' });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Archon Master: user ↔ owner membership management
// Guard: user:admin — only user administrators manage owner assignments.
// ──────────────────────────────────────────────────────────────────────────
const ownersGuard = {
  onRequest: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  },
  preHandler: [requirePermission('admin:role:edit')],
};

/** FC159 T5b — `GET /users`/`PATCH /users/:id` exigían solo JWT válido, sin guard de
 *  permiso (a diferencia de `GET /users/:uuid/node` y los endpoints de owners). onRequest
 *  sin try/catch preserva el 401 idéntico al que hoy produce `request.jwtVerify()` llamado
 *  directo en el handler. */
const userAdminGuard = {
  onRequest: async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();
  },
  preHandler: [requirePermission('user:admin')],
};

async function handleGetUserOwners(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { id } = request.params as { id: string };
  try {
    const ownerScope = await UserManagementService.resolveOwnerScope(request.user as ScopedUser);
    const result = await UserManagementService.getUserOwners(id, ownerScope);
    if (!result.ok) {
      return reply
        .code(result.status)
        .send({ success: false, code: result.code, message: result.message });
    }
    return reply.send({ success: true, data: result.data });
  } catch (e) {
    request.log.error({ err: (e as Error).message }, 'User owners fetch failed');
    return reply.code(500).send({ success: false, code: 'INTERNAL_ERROR', message: 'OWNERS_FAIL' });
  }
}

async function handlePutUserOwners(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const parsed = z
    .object({ ownerIds: z.array(z.number().int()), reason: z.string().min(5) })
    .safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message });
  }
  const { id } = request.params as { id: string };
  const { ownerIds, reason } = parsed.data;
  const admin = request.user as ScopedUser;
  try {
    const result = await UserManagementService.updateUserOwners(id, ownerIds, reason, admin);
    if (!result.ok) {
      return reply.code(result.status).send({
        success: false,
        code: result.code,
        message: result.message,
        ...(result.field ? { field: result.field } : {}),
      });
    }
    return reply.send({ success: true, data: { ownerIds: result.ownerIds } });
  } catch (e) {
    request.log.error({ err: (e as Error).message }, 'User owners update failed');
    return reply
      .code(500)
      .send({ success: false, code: 'INTERNAL_ERROR', message: 'OWNERS_UPDATE_FAIL' });
  }
}

// FC 082 F3c2 Cond.2 (Bravo) — retirado con el CRUD legacy de roles (roles
// solo conserva la fila 0 desde mig.164). 410, no 404: la ruta existió y
// fue retirada a propósito, no es un typo de URL. Gobernanza de roles reales
// vía /v1/cosmonauts/roles* (chasis cosmonauta, Cond.9).
async function handleGetRoles(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  await request.jwtVerify();
  return reply.code(410).send({
    success: false,
    code: 'GONE',
    message: 'Retirado en FC082 F3c2 — usar /v1/cosmonauts/roles',
  });
}

async function handleGetMe(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
    const { id, tenant_id: claimedTenantId } = request.user as {
      id: number;
      tenant_id?: number | null;
    };
    const result = await SessionService.getMe(id, claimedTenantId);
    if (!result) {
      return reply
        .code(404)
        .send({ success: false, code: 'NOT_FOUND', message: 'Usuario no encontrado' });
    }
    const { mapped, permissions, tenantId, ownerType, availableTenants } = result;
    return reply.send({
      success: true,
      data: { ...mapped, capabilities: permissions, tenantId, ownerType, availableTenants },
    });
  } catch (error) {
    if (error instanceof MultiMembershipHaltError) {
      return haltMultiMembership(request, reply, error);
    }
    request.log.error(error);
    return reply
      .code(500)
      .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al cargar perfil' });
  }
}

async function handleGetUserNode(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
    const perms = (request.user as { permissions: string[] }).permissions;
    if (!perms.includes('*') && !perms.includes('user:admin')) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Permission required: user:admin' });
    }
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await UserManagementService.resolveOwnerScope(request.user as ScopedUser);
    const result = await UserManagementService.getUserNode(uuid, ownerScope);
    if (!result.ok) {
      return reply.code(result.status).send({
        success: false,
        ...(result.code ? { code: result.code } : {}),
        message: result.message,
      });
    }
    return reply.send({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof MultiMembershipHaltError) {
      return haltMultiMembership(request, reply, error);
    }
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Error al cargar nodo de usuario' });
  }
}

/** Registers the 12 /v1/auth endpoints — thin handlers only, all logic delegated to services. */
export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { username?: string; password?: string } }>(
    '/login',
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'production' ? 10 : 1000,
          timeWindow: '1 minute',
        },
      },
    },
    handleLogin
  );
  fastify.post('/refresh', handleRefresh);
  fastify.post<{ Body: { tenantId?: number } }>('/switch-tenant', handleSwitchTenant);
  fastify.post('/logout', handleLogout);
  // FC 082 F0c — POST /register eliminado (bandas {1,3,4} muertas — 084_AN §1a).
  fastify.get('/users', userAdminGuard, handleGetUsers);
  fastify.patch('/users/:id', userAdminGuard, handlePatchUser);
  fastify.delete('/users/:id', handleDeleteUser);
  fastify.get('/users/:id/owners', ownersGuard, handleGetUserOwners);
  fastify.put('/users/:id/owners', ownersGuard, handlePutUserOwners);
  // FC 082 F0c — POST /sub-users eliminado (roles {2,4,5} y concepto familiar
  // muertos — 084_AN §1a). Los sub-usuarios renacen en F3 como relaciones Arc.
  fastify.get('/roles', handleGetRoles);
  // GET /v1/auth/users/:uuid/node — Sovereign node: full user profile + permissions + recent activity
  // GET /v1/auth/me — resolved user profile + capabilities (union of all assigned roles)
  fastify.get('/me', handleGetMe);
  fastify.get('/users/:uuid/node', handleGetUserNode);
}
