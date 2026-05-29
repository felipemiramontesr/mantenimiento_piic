import { FastifyInstance, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * 🔱 ARCHON GEOLOCATION ROUTER (v.2.0.0)
 * Provides optimized endpoints for cascading State ➔ Municipality ➔ Neighborhood dropdowns.
 */
export default async function geolocationRoutes(fastify: FastifyInstance): Promise<void> {
  // 1. Fetch States
  fastify.get('/states', async (_request, reply) => {
    try {
      const [rows] = await db.execute('SELECT id, name FROM states ORDER BY name ASC');
      return reply.send({ success: true, data: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Failed to fetch states' });
    }
  });

  // 2. Fetch Municipalities by State with predictive query search
  fastify.get(
    '/states/:stateId/municipalities',
    async (
      request: FastifyRequest<{
        Params: { stateId: string };
        Querystring: { search?: string; q?: string };
      }>,
      reply
    ) => {
      const { stateId } = request.params;
      const search = request.query.search || request.query.q || '';

      try {
        let query = 'SELECT id, name FROM municipalities WHERE state_id = ?';
        const params: (string | number)[] = [stateId];

        if (search.trim() !== '') {
          query += ' AND name LIKE ?';
          params.push(`%${search}%`);
        }

        query += ' ORDER BY name ASC';

        const [rows] = await db.execute(query, params);
        return reply.send({ success: true, data: rows });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch municipalities',
          });
      }
    }
  );

  // 3. Fetch Neighborhoods by Municipality with predictive query search (by name or postal code)
  fastify.get(
    '/municipalities/:municipalityId/neighborhoods',
    async (
      request: FastifyRequest<{
        Params: { municipalityId: string };
        Querystring: { search?: string; q?: string };
      }>,
      reply
    ) => {
      const { municipalityId } = request.params;
      const search = request.query.search || request.query.q || '';

      try {
        let query =
          'SELECT id, name, postal_code as postalCode, city FROM neighborhoods WHERE municipality_id = ?';
        const params: (string | number)[] = [municipalityId];

        if (search.trim() !== '') {
          query += ' AND (name LIKE ? OR postal_code LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY name ASC LIMIT 250'; // Prevents out-of-memory or huge payloads

        const [rows] = await db.execute(query, params);
        return reply.send({ success: true, data: rows });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch neighborhoods',
          });
      }
    }
  );

  // 4. Fetch Neighborhood Details by ID for hydration
  fastify.get(
    '/neighborhoods/:neighborhoodId',
    async (request: FastifyRequest<{ Params: { neighborhoodId: string } }>, reply) => {
      const { neighborhoodId } = request.params;

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT c.id, c.name, c.postal_code as postalCode, c.municipality_id as municipalityId, m.state_id as stateId
           FROM neighborhoods c
           JOIN municipalities m ON c.municipality_id = m.id
           WHERE c.id = ? LIMIT 1`,
          [neighborhoodId]
        );

        if (rows.length === 0) {
          return reply
            .status(404)
            .send({ success: false, code: 'NOT_FOUND', message: 'Neighborhood not found' });
        }

        return reply.send({ success: true, data: rows[0] });
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch neighborhood details',
          });
      }
    }
  );
}
