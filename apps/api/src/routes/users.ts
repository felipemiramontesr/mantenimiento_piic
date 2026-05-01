import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * 🔱 Archon User Management Routes
 * Specialized module for profile customization and identity metadata.
 */
export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook: Ensure session integrity
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  /**
   * 🔱 POST /v1/users/:id/upload-profile
   * Handles multipart image uploads (JPG/PNG) for user profiles.
   */
  fastify.post('/users/:id/upload-profile', async (request, reply) => {
    const { id } = request.params as { id: string };

    // 🛡️ Pre-validation: Verify user existence before accepting bytes
    const [existing] = await db.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return reply.code(404).send({ error: 'Identity not found' });
    }

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No bytes received' });
    }

    // 🛡️ Mime-Type Guard: Strict JPG/PNG filter
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Sovereign standard: Only JPG and PNG are accepted' });
    }

    // 🏗️ Path construction: managed within /uploads/profiles (v.2.0.1 Relative Sync)
    const ext = path.extname(data.filename) || (data.mimetype === 'image/png' ? '.png' : '.jpg');
    const newFilename = `profile_user_${id}_${Date.now()}${ext}`;

    // We use file-relative paths to ensure infrastructure stability across different environments
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    const uploadPath = path.join(uploadDir, newFilename);

    try {
      // 1. Persist file to infrastructure
      await pipeline(data.file, fs.createWriteStream(uploadPath));

      // 2. Update Sovereign Registry
      // We store the physical path in DB, but the system will expose it via the logical route
      await db.execute('UPDATE users SET profile_picture_url = ? WHERE id = ?', [newFilename, id]);

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
  });

  /**
   * 🔱 GET /v1/users/:id/profile-image
   * Secure Logic-Gated Asset Serving (Friendly URL)
   * v.2.0.0 - Permission-based image delivery
   */
  fastify.get('/users/:id/profile-image', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // 1. Fetch filename from Sovereign Registry
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

      // 🛡️ Security Check: Verify file exists on disk
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'Physical asset missing' });
      }

      // 🛡️ Mime-Type Recovery
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

      // 🔱 Logic-Gated Stream: Serving the file with authorization
      const stream = fs.createReadStream(filePath);
      return reply.type(contentType).send(stream);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Storage access exception' });
    }
  });
}
