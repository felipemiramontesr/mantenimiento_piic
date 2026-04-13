import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';

const createFleetSchema = z.object({
  tag: z.string().min(2).max(50),
  type: z.string().min(2).max(50),
});

const updateFleetSchema = z.object({
  tag: z.string().min(2).max(50).optional(),
  type: z.string().min(2).max(50).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  assigned_to: z.number().nullable().optional(),
});

interface FleetUnit extends RowDataPacket {
  id: string;
  tag: string;
  type: string;
  status: string;
  assigned_to: number | null;
  last_maintenance_date: string | null;
}

export default async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Global Security middleware for all fleet endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      return undefined;
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized: Valid Session required' });
    }
  });

  /**
   * GET /api/v1/fleet
   * Retrieves the comprehensive inventory mapping of vehicles.
   */
  fastify.get('/fleet', async (request, reply) => {
    try {
      const [rows] = await db.execute<FleetUnit[]>(
        'SELECT id, tag, type, status, assigned_to, last_maintenance_date FROM fleet_units ORDER BY created_at DESC'
      );
      
      return reply.send({ success: true, count: rows.length, data: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal Database Exception' });
    }
  });

  /**
   * POST /api/v1/fleet
   * Register a new vehicle unit into the inventory.
   */
  fastify.post('/fleet', async (request, reply) => {
    const parse = createFleetSchema.safeParse(request.body);
    
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid data format', details: parse.error.format() });
    }

    const { tag, type } = parse.data;
    const id = randomUUID();
    const creatorId = (request.user as { id: number }).id;

    try {
      // Check for duplicate tags
      const [existing] = await db.execute<FleetUnit[]>(
        'SELECT id FROM fleet_units WHERE tag = ?',
        [tag]
      );

      if (existing.length > 0) {
        return reply.code(409).send({ error: `Unit identity '${tag}' already exists in registry` });
      }

      await db.execute(
        'INSERT INTO fleet_units (id, tag, type, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
        [id, tag, type, 'ACTIVE', creatorId]
      );

      return reply.code(201).send({ success: true, id });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to commit unit to registry' });
    }
  });

  /**
   * PATCH /api/v1/fleet/:id
   * Update metadata or status of an existing vehicle unit.
   */
  fastify.patch('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = updateFleetSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parse.error.format() });
    }

    const updates = parse.data;
    const fields = Object.keys(updates);
    
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No update parameters provided' });
    }

    try {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), id];

      const [result] = await db.execute(
        `UPDATE fleet_units SET ${setClause} WHERE id = ?`,
        values
      );

      const affected = (result as { affectedRows: number }).affectedRows;
      
      if (affected === 0) {
        return reply.code(404).send({ error: 'Unit not found in registry' });
      }

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update system registry' });
    }
  });

  /**
   * DELETE /api/v1/fleet/:id
   * Permanently decommission a unit from the active registry.
   */
  fastify.delete('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const [result] = await db.execute(
        'DELETE FROM fleet_units WHERE id = ?',
        [id]
      );

      const affected = (result as { affectedRows: number }).affectedRows;
      
      if (affected === 0) {
        return reply.code(404).send({ error: 'Unit not found in registry' });
      }

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Critical failure during unit decommissioning' });
    }
  });
}
