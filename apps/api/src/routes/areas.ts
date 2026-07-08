import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import db from '../services/db';

const AREA_TEMPLATES = [
  'Mantenimiento',
  'Finanzas',
  'RRHH',
  'Operaciones',
  'Compras',
  'Logística',
  'Seguridad',
  'Administración',
] as const;

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

export default async function areasRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/areas/templates — static, no auth required
  fastify.get('/areas/templates', async (_request, reply) =>
    reply.send({ success: true, data: AREA_TEMPLATES })
  );

  // GET /v1/owners/:id/areas
  fastify.get('/owners/:id/areas', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const { id } = request.params as { id: string };
    const caller = request.user as { id: number; permissions: string[] };
    const ownerIds = await getCallerOwnerIds(caller.id);
    if (!hasAdminAccess(caller.permissions) && !ownerIds.includes(Number(id))) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, owner_id, name, is_active, created_at FROM areas WHERE owner_id = ? ORDER BY name',
        [id]
      );
      return reply.send({ success: true, data: rows });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'AREAS_FETCH_FAIL' });
    }
  });

  // POST /v1/owners/:id/areas — Archon Master only (Scenario 6/7)
  fastify.post('/owners/:id/areas', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const schema = z.object({ name: z.string().min(1).max(100) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    }
    const { id } = request.params as { id: string };
    const caller = request.user as { id: number; permissions: string[] };
    if (!hasAdminAccess(caller.permissions)) {
      return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
    }
    try {
      const [ownerRows] = await db.execute<RowDataPacket[]>(
        "SELECT o.id FROM owners o JOIN owner_types_catalog otc ON otc.id = o.owner_type_id WHERE o.id = ? AND otc.code = 'FLOTILLA'",
        [id]
      );
      if (ownerRows.length === 0) {
        return reply.code(400).send({ error: 'INVALID_OWNER' });
      }
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO areas (owner_id, name) VALUES (?, ?)',
        [id, parsed.data.name]
      );
      return reply.code(201).send({
        success: true,
        data: {
          id: result.insertId,
          owner_id: Number(id),
          name: parsed.data.name,
          is_active: true,
        },
      });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'AREA_CREATE_FAIL' });
    }
  });

  // PUT /v1/owners/:id/areas/:areaId — Archon Master only
  fastify.put('/owners/:id/areas/:areaId', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const schema = z.object({ name: z.string().min(1).max(100) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.format() });
    }
    const { id, areaId } = request.params as { id: string; areaId: string };
    const caller = request.user as { id: number; permissions: string[] };
    if (!hasAdminAccess(caller.permissions)) {
      return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
    }
    try {
      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM areas WHERE id = ? AND owner_id = ?',
        [areaId, id]
      );
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Area not found' });
      }
      await db.execute('UPDATE areas SET name = ? WHERE id = ? AND owner_id = ?', [
        parsed.data.name,
        areaId,
        id,
      ]);
      return reply.send({
        success: true,
        data: { id: Number(areaId), owner_id: Number(id), name: parsed.data.name },
      });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'AREA_UPDATE_FAIL' });
    }
  });

  // DELETE /v1/owners/:id/areas/:areaId (soft delete) — Archon Master only
  fastify.delete('/owners/:id/areas/:areaId', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const { id, areaId } = request.params as { id: string; areaId: string };
    const caller = request.user as { id: number; permissions: string[] };
    if (!hasAdminAccess(caller.permissions)) {
      return reply.code(403).send({ success: false, code: 'FORBIDDEN' });
    }
    try {
      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM areas WHERE id = ? AND owner_id = ?',
        [areaId, id]
      );
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Area not found' });
      }
      await db.execute('UPDATE areas SET is_active = 0 WHERE id = ? AND owner_id = ?', [
        areaId,
        id,
      ]);
      return reply.send({ success: true });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'AREA_DELETE_FAIL' });
    }
  });
}
