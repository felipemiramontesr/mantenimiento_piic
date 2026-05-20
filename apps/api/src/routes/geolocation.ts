import { FastifyInstance, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * 🔱 ARCHON GEOLOCATION ROUTER (v.1.1.0)
 * Provides optimized endpoints for cascading State ➔ Municipality ➔ Colonia dropdowns.
 */
export default async function geolocationRoutes(fastify: FastifyInstance): Promise<void> {
  // 1. Fetch States
  fastify.get('/states', async (_request, reply) => {
    try {
      const [rows] = await db.execute('SELECT id, nombre FROM estados ORDER BY nombre ASC');
      return rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch states' });
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
        let query = 'SELECT id, nombre FROM municipios WHERE estado = ?';
        const params: (string | number)[] = [stateId];

        if (search.trim() !== '') {
          query += ' AND nombre LIKE ?';
          params.push(`%${search}%`);
        }

        query += ' ORDER BY nombre ASC';

        const [rows] = await db.execute(query, params);
        return rows;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch municipalities' });
      }
    }
  );

  // 3. Fetch Colonias by Municipality with predictive query search (by name or postal code)
  fastify.get(
    '/municipalities/:municipioId/colonias',
    async (
      request: FastifyRequest<{
        Params: { municipioId: string };
        Querystring: { search?: string; q?: string };
      }>,
      reply
    ) => {
      const { municipioId } = request.params;
      const search = request.query.search || request.query.q || '';

      try {
        let query =
          'SELECT id, nombre, codigo_postal as codigoPostal, ciudad FROM colonias WHERE municipio = ?';
        const params: (string | number)[] = [municipioId];

        if (search.trim() !== '') {
          query += ' AND (nombre LIKE ? OR codigo_postal LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY nombre ASC LIMIT 250'; // Prevents out-of-memory or huge payloads

        const [rows] = await db.execute(query, params);
        return rows;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch colonias' });
      }
    }
  );

  // 4. Fetch Colonia Details by ID for hydration
  fastify.get(
    '/colonias/:coloniaId',
    async (request: FastifyRequest<{ Params: { coloniaId: string } }>, reply) => {
      const { coloniaId } = request.params;

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT c.id, c.nombre, c.codigo_postal as codigoPostal, c.municipio as municipioId, m.estado as stateId
           FROM colonias c
           JOIN municipios m ON c.municipio = m.id
           WHERE c.id = ? LIMIT 1`,
          [coloniaId]
        );

        if (rows.length === 0) {
          return reply.status(404).send({ error: 'Colonia not found' });
        }

        return rows[0];
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch colonia details' });
      }
    }
  );
}
