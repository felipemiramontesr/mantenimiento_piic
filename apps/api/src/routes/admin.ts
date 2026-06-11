import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';
import withConnection from '../utils/withConnection';

function canAccessAdmin(permissions: string[]): boolean {
  return permissions.includes('*') || permissions.includes('system:manage_roles');
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { permissions } = request.user as { permissions: string[] };
      if (!canAccessAdmin(permissions)) {
        reply
          .code(403)
          .send({ success: false, code: 'FORBIDDEN', message: 'Acceso restringido a GrayMan' });
      }
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Sesión requerida' });
    }
  });

  // GET /v1/admin/roles-permissions
  fastify.get('/admin/roles-permissions', async (_request, reply) => {
    try {
      const [roles] = await db.execute<RowDataPacket[]>(
        'SELECT id, name FROM roles WHERE id > 0 ORDER BY id'
      );

      const [allPerms] = await db.execute<RowDataPacket[]>(
        'SELECT id, slug FROM permissions ORDER BY id'
      );

      const [rolePerms] = await db.execute<RowDataPacket[]>(
        `SELECT rp.role_id, p.slug
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         ORDER BY rp.role_id, p.slug`
      );

      const permsByRole: Record<number, string[]> = {};
      (rolePerms as RowDataPacket[]).forEach((r) => {
        const rid = r.role_id as number;
        if (!permsByRole[rid]) permsByRole[rid] = [];
        permsByRole[rid].push(r.slug as string);
      });

      return reply.send({
        success: true,
        data: {
          roles: (roles as RowDataPacket[]).map((r) => ({
            id: r.id as number,
            name: r.name as string,
            permissions: permsByRole[r.id as number] ?? [],
          })),
          allPermissions: (allPerms as RowDataPacket[]).map((p) => ({
            id: p.id as number,
            slug: p.slug as string,
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Admin roles-permissions error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al obtener permisos' });
    }
  });

  // GET /v1/admin/roles — list all roles (for Card 1 CRUD)
  fastify.get('/admin/roles', async (_request, reply) => {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, description FROM roles ORDER BY id'
      );
      return reply.send({ success: true, data: rows });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Admin get roles error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al obtener roles' });
    }
  });

  // POST /v1/admin/roles — create new role
  fastify.post('/admin/roles', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2).max(64),
      description: z.string().max(255).optional().default(''),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      });

    const { name, description } = parsed.data;
    try {
      const [existing] = await db.execute<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', [
        name,
      ]);
      if (existing.length > 0)
        return reply
          .code(409)
          .send({ success: false, code: 'CONFLICT', message: 'Ya existe un rol con ese nombre' });

      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );
      return reply
        .code(201)
        .send({ success: true, data: { id: result.insertId, name, description } });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Admin create role error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al crear rol' });
    }
  });

  // PATCH /v1/admin/roles/:roleId — update role name/description
  fastify.patch('/admin/roles/:roleId', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2).max(64).optional(),
      description: z.string().max(255).optional(),
    });
    const { roleId } = request.params as { roleId: string };
    const parsedId = parseInt(roleId, 10);
    if (Number.isNaN(parsedId) || parsedId < 0)
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: 'roleId inválido' });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      });

    const { name, description } = parsed.data;
    if (!name && description === undefined)
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: 'Nada que actualizar' });

    try {
      const [roleCheck] = await db.execute<RowDataPacket[]>('SELECT id FROM roles WHERE id = ?', [
        parsedId,
      ]);
      if (roleCheck.length === 0)
        return reply
          .code(404)
          .send({ success: false, code: 'NOT_FOUND', message: 'Rol no encontrado' });

      const fields: string[] = [];
      const values: (string | number)[] = [];
      if (name) {
        fields.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
      }
      values.push(parsedId);
      await db.execute(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, values);
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Admin update role error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al actualizar rol' });
    }
  });

  // DELETE /v1/admin/roles/:roleId — delete role (guard: no assigned users)
  fastify.delete('/admin/roles/:roleId', async (request, reply) => {
    const { roleId } = request.params as { roleId: string };
    const parsedId = parseInt(roleId, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0)
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'roleId inválido — no se puede eliminar el rol Archon (id=0)',
      });

    try {
      const [roleCheck] = await db.execute<RowDataPacket[]>('SELECT id FROM roles WHERE id = ?', [
        parsedId,
      ]);
      if (roleCheck.length === 0)
        return reply
          .code(404)
          .send({ success: false, code: 'NOT_FOUND', message: 'Rol no encontrado' });

      const [usersWithRole] = await db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM user_roles WHERE role_id = ?',
        [parsedId]
      );
      if ((usersWithRole[0].cnt as number) > 0)
        return reply.code(409).send({
          success: false,
          code: 'CONFLICT',
          message: 'No se puede eliminar un rol con usuarios asignados',
        });

      await db.execute('DELETE FROM roles WHERE id = ?', [parsedId]);
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Admin delete role error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al eliminar rol' });
    }
  });

  // PUT /v1/admin/roles/:roleId/permissions
  fastify.put('/admin/roles/:roleId/permissions', async (request, reply) => {
    const schema = z.object({ permissions: z.array(z.string()).min(0) });
    const { roleId } = request.params as { roleId: string };
    const parsedRoleId = parseInt(roleId, 10);

    if (Number.isNaN(parsedRoleId) || parsedRoleId <= 0) {
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'roleId inválido',
        field: 'roleId',
      });
    }

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      });
    }

    const { permissions } = parsed.data;

    return withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const [roleCheck] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM roles WHERE id = ?',
          [parsedRoleId]
        );
        if (roleCheck.length === 0) {
          await connection.rollback();
          return reply
            .code(404)
            .send({ success: false, code: 'NOT_FOUND', message: 'Rol no encontrado' });
        }

        await connection.execute<ResultSetHeader>(
          'DELETE FROM role_permissions WHERE role_id = ?',
          [parsedRoleId]
        );

        if (permissions.length > 0) {
          const [permRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, slug FROM permissions WHERE slug IN (${permissions
              .map(() => '?')
              .join(',')})`,
            permissions
          );

          const insertValues = (permRows as RowDataPacket[]).map((p) => [
            parsedRoleId,
            p.id as number,
          ]);
          if (insertValues.length > 0) {
            await connection.execute<ResultSetHeader>(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ${insertValues
                .map(() => '(?,?)')
                .join(',')}`,
              insertValues.flat()
            );
          }
        }

        await connection.commit();
        return reply.send({ success: true, data: { roleId: parsedRoleId, permissions } });
      } catch (error) {
        await connection.rollback();
        fastify.log.error({ err: (error as Error).message }, 'Admin update permissions error');
        return reply
          .code(500)
          .send({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Error al actualizar permisos',
          });
      }
    });
  });
}

export default adminRoutes;
