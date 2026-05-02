import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/** Max decoded image size: 2MB */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * 🔱 Archon User Management Routes — Plan Omega
 * Profile images stored as Base64 data URIs directly in MySQL.
 * Zero filesystem dependency. Immune to Hostinger volatile deploys.
 */
export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * 🔱 POST /v1/users/:id/upload-profile
   * Receives Base64 image, stores complete data URI in MySQL.
   */
  fastify.post(
    '/users/:id/upload-profile',
    { bodyLimit: 3 * 1024 * 1024 },
    async (request, reply) => {
      // 🛡️ Session verification
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Archon Protection: Session required' });
      }

      const { id } = request.params as { id: string };

      // 🛡️ Identity Lock
      const tokenData = request.user as { id: string | number };
      if (String(tokenData.id) !== String(id)) {
        return reply.code(403).send({ error: 'Archon Sovereignty: Unauthorized Identity Access' });
      }

      // 🛡️ Existence check
      const [existing] = await db.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [
        id,
      ]);
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Identity not found' });
      }

      const body = request.body as { image?: string; mime?: string } | null;
      if (!body || !body.image) {
        return reply.code(400).send({ error: 'No image data received' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const mime = body.mime || 'image/jpeg';
      if (!allowedTypes.includes(mime)) {
        return reply.code(400).send({ error: 'Sovereign standard: Only JPG and PNG are accepted' });
      }

      // Strip any existing data URI prefix, validate size
      const base64Clean = body.image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');

      if (buffer.length > MAX_IMAGE_BYTES) {
        return reply.code(400).send({ error: 'Image exceeds 2MB limit' });
      }

      // Build complete data URI for native <img src> rendering
      const dataUri = `data:${mime};base64,${base64Clean}`;

      try {
        await db.execute('UPDATE users SET profile_picture_url = ? WHERE id = ?', [dataUri, id]);

        return reply.send({
          success: true,
          message: 'Profile identity updated',
          url: dataUri,
        });
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(`❌ DB Failure: ${error.message}`);
        return reply.code(500).send({ error: 'Infrastructure failure' });
      }
    }
  );

  /**
   * 🔱 GET /v1/users/:id/profile-image
   * Decodes Base64 from MySQL and serves as binary image.
   * Public endpoint — no JWT required for native <img> tag support.
   */
  fastify.get('/users/:id/profile-image', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT profile_picture_url FROM users WHERE id = ?',
        [id]
      );
      const user = rows[0];

      if (!user || !user.profile_picture_url) {
        return reply.code(404).send({ error: 'Image not found' });
      }

      const stored = user.profile_picture_url as string;

      // Data URI: decode and serve as binary image
      if (stored.startsWith('data:')) {
        const matches = stored.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
          return reply.code(404).send({ error: 'Invalid image data format' });
        }
        const contentType = matches[1];
        const imageBuffer = Buffer.from(matches[2], 'base64');
        return reply.type(contentType).send(imageBuffer);
      }

      // Legacy filename reference — filesystem storage deprecated
      return reply.code(404).send({ error: 'Legacy image reference — please re-upload' });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Storage access exception' });
    }
  });
}
