import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

// 🔱 ESM Compatibility
/* eslint-disable no-underscore-dangle */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

/** Max decoded image size: 2MB */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * 🔱 Archon User Management Routes
 * Specialized module for profile customization and identity metadata.
 */
export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * 🔱 POST /v1/users/:id/upload-profile
   * Base64 JSON transport for profile images.
   * PROTECTED: Requires valid JWT session.
   */
  fastify.post(
    '/users/:id/upload-profile',
    {
      bodyLimit: 3 * 1024 * 1024,
    },
    async (request, reply) => {
      // 🛡️ Manual verification to avoid global hook side-effects
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Archon Protection: Session required' });
      }

      const { id } = request.params as { id: string };

      // 🛡️ Identity Lock: Ensure the user can only modify their own profile assets
      const tokenData = request.user as { id: string | number };
      if (String(tokenData.id) !== String(id)) {
        return reply.code(403).send({ error: 'Archon Sovereignty: Unauthorized Identity Access' });
      }

      // 🛡️ Pre-validation: Verify user existence
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

      const base64Clean = body.image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');

      if (buffer.length > MAX_IMAGE_BYTES) {
        return reply.code(400).send({ error: 'Image exceeds 2MB limit after decoding' });
      }

      const ext = mime === 'image/png' ? '.png' : '.jpg';
      const newFilename = `profile_user_${id}_${Date.now()}${ext}`;

      const uploadDir = path.join(__dirname, '../../uploads/profiles');
      const uploadPath = path.join(uploadDir, newFilename);

      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(uploadPath, buffer);
        await db.execute('UPDATE users SET profile_picture_url = ? WHERE id = ?', [
          newFilename,
          id,
        ]);

        fastify.log.info(`✅ Profile picture updated for user ${id}: ${newFilename}`);

        return reply.send({
          success: true,
          message: 'Profile identity updated',
          url: `/v1/users/${id}/profile-image`,
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Infrastructure failure during file persistence' });
      }
    }
  );

  /**
   * 🔱 GET /v1/users/:id/profile-image
   * Public-facing Asset Serving (Impenetrable by filename timestamp)
   * v.3.1.0 - Unprotected GET to allow native <img> tag rendering
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

      const filename = user.profile_picture_url;
      const filePath = path.join(__dirname, '../../uploads/profiles', filename);

      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'Physical asset missing' });
      }

      const fileExt = path.extname(filename).toLowerCase();
      const contentType = fileExt === '.png' ? 'image/png' : 'image/jpeg';

      const stream = fs.createReadStream(filePath);
      return reply.type(contentType).send(stream);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Storage access exception' });
    }
  });
}
