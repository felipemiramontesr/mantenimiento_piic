import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import db from '../services/db';

async function getCallerOwnerIds(userId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.owner_id as number);
}

function hasAdminAccess(permissions: string[]): boolean {
  return permissions.includes('*') || permissions.includes('user:admin');
}

export default async function serviceCentersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/owners/:privadoId/service-centers — list operational centers for a Privado
  fastify.get('/owners/:privadoId/service-centers', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const { privadoId } = request.params as { privadoId: string };
    const caller = request.user as { id: number; permissions: string[] };

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(Number(privadoId))) {
        return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
      }
    }

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT osl.centro_owner_id, o.label
         FROM owner_service_links osl
         JOIN owners o ON o.id = osl.centro_owner_id
         WHERE osl.privado_owner_id = ?`,
        [privadoId]
      );
      return reply.send({ success: true, data: rows });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'SERVICE_CENTERS_FETCH_FAIL' });
    }
  });

  // POST /v1/owners/:privadoId/service-centers — link a Centro operativamente (N:M)
  fastify.post('/owners/:privadoId/service-centers', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }

    const schema = z.object({ centroOwnerId: z.number().int().positive() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    }

    const { privadoId } = request.params as { privadoId: string };
    const { centroOwnerId } = parsed.data;
    const caller = request.user as { id: number; permissions: string[] };

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(Number(privadoId))) {
        return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
      }
    }

    try {
      const [centroRows] = await db.execute<RowDataPacket[]>(
        'SELECT id, owner_type FROM owners WHERE id = ?',
        [centroOwnerId]
      );
      if (centroRows.length === 0) {
        return reply.code(404).send({ error: 'CENTRO_NOT_FOUND' });
      }
      if (centroRows[0].owner_type !== 'CENTER') {
        return reply.code(400).send({ error: 'NOT_A_CENTER' });
      }

      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM owner_service_links WHERE privado_owner_id = ? AND centro_owner_id = ?',
        [privadoId, centroOwnerId]
      );
      if (existing.length > 0) {
        return reply.code(409).send({ error: 'LINK_EXISTS' });
      }

      await db.execute<ResultSetHeader>(
        'INSERT INTO owner_service_links (privado_owner_id, centro_owner_id) VALUES (?, ?)',
        [privadoId, centroOwnerId]
      );
      return reply.code(201).send({ success: true });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'SERVICE_CENTER_LINK_FAIL' });
    }
  });

  // DELETE /v1/owners/:privadoId/service-centers/:centroId — unlink Centro operativo
  fastify.delete('/owners/:privadoId/service-centers/:centroId', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const { privadoId, centroId } = request.params as { privadoId: string; centroId: string };
    const caller = request.user as { id: number; permissions: string[] };

    if (!hasAdminAccess(caller.permissions)) {
      const ownerIds = await getCallerOwnerIds(caller.id);
      if (!ownerIds.includes(Number(privadoId))) {
        return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
      }
    }

    try {
      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM owner_service_links WHERE privado_owner_id = ? AND centro_owner_id = ?',
        [privadoId, centroId]
      );
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'LINK_NOT_FOUND' });
      }
      await db.execute<ResultSetHeader>(
        'DELETE FROM owner_service_links WHERE privado_owner_id = ? AND centro_owner_id = ?',
        [privadoId, centroId]
      );
      return reply.send({ success: true });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'SERVICE_CENTER_UNLINK_FAIL' });
    }
  });
}
