import { FastifyInstance, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';

/**
 * 🔱 ARCHON SOVEREIGN CATALOGS (v.18.0.0)
 * Logic: Provides dynamic hierarchical metadata for the entire Fleet ecosystem.
 */
export default async function catalogRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook — A01:2021 Broken Access Control
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('fleet:view'));

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

        // 👑 Archon Ordering Intelligence
        if (
          category === 'BRAND' ||
          category === 'MODEL' ||
          category === 'DEPARTMENT' ||
          category === 'LOCATION'
        ) {
          query += ' ORDER BY label ASC';
        } else {
          // ASSET_TYPE, FREQ_TIME, FREQ_USAGE are ordered chronologically by ID
          query += ' ORDER BY id ASC';
        }

        const [rows] = await db.execute(query, params);

        // 🔱 ARCHON DIAGNOSTICS: Verify DB results in real-time
        // eslint-disable-next-line no-console
        console.log(
          `[Archon API] Catalog: ${category} | Query: ${query} | Params: ${params} | Result: ${
            (rows as unknown[]).length
          } rows`
        );

        return rows;
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch catalog data' });
      }
    }
  );

  // 2. Fetch Center owners list (for Rol 4 centro selector in registration form)
  fastify.get('/centers', async (_request, reply) => {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT o.id, cc.label
         FROM owners o
         JOIN common_catalogs cc ON o.catalog_id = cc.id
         WHERE o.owner_type = 'CENTER' AND o.is_active = 1
         ORDER BY cc.label ASC`
      );
      return reply.send({ success: true, data: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Failed to fetch centers' });
    }
  });

  // 3. Fetch specific item by Code
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
