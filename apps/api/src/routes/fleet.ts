import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';

const createFleetSchema = z.object({
  tag: z.string().min(2).max(50),
  type: z.string().min(2).max(50),
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
}
