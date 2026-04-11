import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import db from '../services/db';

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
}
