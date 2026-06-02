import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';

const OMNIPOTENT_USERNAMES = ['archon', 'greyman', 'grayman'];

function isOmnipotent(permissions: string[], username: string): boolean {
  return permissions.includes('*') && OMNIPOTENT_USERNAMES.includes(username.toLowerCase());
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { permissions, username } = request.user as { permissions: string[]; username: string };
      if (!isOmnipotent(permissions, username)) {
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

  // PUT /v1/admin/roles/:roleId/permissions
  fastify.put('/admin/roles/:roleId/permissions', async (request, reply) => {
    const schema = z.object({ permissions: z.array(z.string()).min(0) });
    const { roleId } = request.params as { roleId: string };
    const parsedRoleId = parseInt(roleId, 10);

    if (Number.isNaN(parsedRoleId) || parsedRoleId <= 0) {
      return reply
        .code(400)
        .send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'roleId inválido',
          field: 'roleId',
        });
    }

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0].message,
        });
    }

    const { permissions } = parsed.data;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

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

      await connection.execute<ResultSetHeader>('DELETE FROM role_permissions WHERE role_id = ?', [
        parsedRoleId,
      ]);

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
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al actualizar permisos' });
    } finally {
      connection.release();
    }
  });
}

export default adminRoutes;
