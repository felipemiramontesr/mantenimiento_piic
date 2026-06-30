import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import db from '../../services/db';
import {
  requireOmega,
  requireMuOrOmega,
  resolveEffectivePermissions,
} from '../../middleware/cosmonautMiddleware';

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tenantId: z.number().int().positive(),
  permissions: z.array(z.string()).default([]),
});

export default async function cosmonautRolesRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/cosmonauts/roles?tenantId=X
  // Lists R_global + R_universe roles available in the given Universe.
  fastify.get('/cosmonauts/roles', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    }
    const { tenantId } = request.query as { tenantId?: string };
    const tid = tenantId ? Number(tenantId) : null;

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT cr.id, cr.tenant_id, cr.name, cr.description, cr.is_system,
              COUNT(crp.permission_id) AS permission_count
       FROM cosmonaut_roles cr
       LEFT JOIN cosmonaut_role_permissions crp ON crp.role_id = cr.id
       WHERE cr.tenant_id IS NULL OR cr.tenant_id = ?
       GROUP BY cr.id
       ORDER BY cr.is_system DESC, cr.name ASC`,
      [tid ?? 0]
    );
    return reply.send({ success: true, data: rows });
  });

  // POST /v1/cosmonauts/roles — create R_universe custom role (MU only, I9: cannot create R_global)
  fastify.post('/cosmonauts/roles', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    }

    const parsed = createRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const { name, description, tenantId, permissions } = parsed.data;

    // MU or Ω required for the target Universe
    await requireMuOrOmega(tenantId)(request, reply);
    if (reply.sent) return reply;

    const caller = request.user as { id: number; roleId?: number };

    // I8: anti-escalation — grantor must hold every permission to be assigned to the new role
    const grantorPerms = await resolveEffectivePermissions(caller.id, tenantId);
    const isOmega = caller.roleId === 0;

    if (!isOmega && permissions.length > 0) {
      const missing = permissions.filter((slug) => !grantorPerms.includes(slug));
      if (missing.length > 0) {
        return reply.code(403).send({
          success: false,
          code: 'PRIVILEGE_ESCALATION',
          message: 'Privilege escalation denied',
          details: missing,
        });
      }
    }

    // Resolve permission IDs from slugs
    let permRows: RowDataPacket[] = [];
    if (permissions.length > 0) {
      const placeholders = permissions.map(() => '?').join(',');
      const [pRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, slug FROM permissions WHERE slug IN (${placeholders})`,
        permissions
      );
      permRows = pRows;
      if (permRows.length !== permissions.length) {
        const found = permRows.map((p) => p.slug as string);
        const unknown = permissions.filter((s) => !found.includes(s));
        return reply
          .code(400)
          .send({ success: false, code: 'UNKNOWN_PERMISSIONS', details: unknown });
      }
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system, created_by) VALUES (?, ?, ?, 0, ?)',
        [tenantId, name, description ?? null, caller.id]
      );
      const roleId = result.insertId;

      if (permRows.length > 0) {
        const permValues = permRows.map((p) => [roleId, p.id as number]);
        await conn.query(
          'INSERT INTO cosmonaut_role_permissions (role_id, permission_id) VALUES ?',
          [permValues]
        );
      }

      await conn.commit();
      return reply
        .code(201)
        .send({ success: true, data: { id: roleId, name, tenantId, permissions } });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // DELETE /v1/cosmonauts/roles/:roleId — I9: Ω for R_global; MU for R_universe
  fastify.delete('/cosmonauts/roles/:roleId', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    }
    const { roleId } = request.params as { roleId: string };

    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, is_system, tenant_id FROM cosmonaut_roles WHERE id = ? LIMIT 1',
      [Number(roleId)]
    );
    if (rows.length === 0) {
      return reply.code(404).send({ success: false, code: 'NOT_FOUND' });
    }
    const role = rows[0];

    if (role.is_system === 1) {
      // I9: R_global roles are Ω-only
      await requireOmega()(request, reply);
      if (reply.sent) return reply;
      // Ω can delete — but in practice global system roles should not be deleted in prod
    } else {
      // R_universe: MU or Ω of the owning Universe
      await requireMuOrOmega(role.tenant_id as number)(request, reply);
      if (reply.sent) return reply;
    }

    await db.execute('DELETE FROM cosmonaut_roles WHERE id = ?', [Number(roleId)]);
    return reply.send({ success: true });
  });
}
