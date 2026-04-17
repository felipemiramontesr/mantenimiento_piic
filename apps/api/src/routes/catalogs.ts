import { FastifyInstance, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * 🔱 ARCHON SOVEREIGN CATALOGS (v.18.0.0)
 * Logic: Provides dynamic hierarchical metadata for the entire Fleet ecosystem.
 */
export default async function catalogRoutes(fastify: FastifyInstance): Promise<void> {
  // 1. Fetch options by Category (e.g. ASSET_TYPE, FREQ_TIME)
  fastify.get(
    '/:category',
    async (
      request: FastifyRequest<{ Params: { category: string }; Querystring: { parentId?: number } }>,
      reply
    ) => {
      const { category } = request.params;
      const { parentId } = request.query;

      try {
        let query =
          'SELECT id, code, label, numeric_value as numericValue, unit FROM common_catalogs WHERE category = ? AND is_active = TRUE';
        const params: (string | number)[] = [category];

        if (parentId) {
          query += ' AND parent_id = ?';
          params.push(parentId);
        }

        const [rows] = await db.execute(query, params);
        return rows;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch catalog data' });
      }
    }
  );

  // 2. Fetch specific item by Code
  fastify.get(
    '/item/:code',
    async (request: FastifyRequest<{ Params: { code: string } }>, reply) => {
      const { code } = request.params;

      try {
        const [rows] = await db.execute<RowDataPacket[]>(
          'SELECT id, code, label, numeric_value as numericValue, unit FROM common_catalogs WHERE code = ? AND is_active = TRUE LIMIT 1',
          [code]
        );

        if (rows.length === 0) {
          return reply.status(404).send({ error: 'Catalog item not found' });
        }

        return rows[0];
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch item' });
      }
    }
  );
}
