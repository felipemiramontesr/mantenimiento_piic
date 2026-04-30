import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
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
    const [existing] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
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

    // 🏗️ Path construction: managed within /uploads/profiles
    const ext = path.extname(data.filename) || (data.mimetype === 'image/png' ? '.png' : '.jpg');
    const newFilename = `profile_user_${id}_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads/profiles');
    const uploadPath = path.join(uploadDir, newFilename);
    const publicUrl = `/uploads/profiles/${newFilename}`;

    try {
      // 1. Persist file to infrastructure
      await pipeline(data.file, fs.createWriteStream(uploadPath));

      // 2. Update Sovereign Registry
      await db.execute(
        'UPDATE users SET profile_picture_url = ? WHERE id = ?',
        [publicUrl, id]
      );

      fastify.log.info(`✅ Profile picture updated for user ${id}: ${newFilename}`);

      return reply.send({ 
        success: true, 
        message: 'Profile identity updated',
        url: publicUrl 
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Infrastructure failure during file persistence' });
    }
  });
}
