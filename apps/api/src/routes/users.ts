import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * 🏗️ Sovereign Path Resolution (Persistent Storage)
 * We move the uploads OUTSIDE the Node.js deployment folder so Hostinger's
 * Git auto-deploy doesn't wipe untracked files during repository syncs.
 */
const UPLOAD_BASE = path.join(process.cwd(), '../archon_assets/profiles');

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
   */
  fastify.post(
    '/users/:id/upload-profile',
    {
      bodyLimit: 3 * 1024 * 1024,
    },
    async (request, reply) => {
      // 🛡️ Manual verification
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

      // 🛡️ Pre-validation
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
        return reply.code(400).send({ error: 'Image exceeds 2MB limit' });
      }

      const ext = mime === 'image/png' ? '.png' : '.jpg';
      const newFilename = `profile_user_${id}_${Date.now()}${ext}`;
      const uploadPath = path.join(UPLOAD_BASE, newFilename);

      try {
        // 🏗️ Ensure upload directory exists with explicit permissions
        if (!fs.existsSync(UPLOAD_BASE)) {
          fastify.log.info(`🏗️ Creating persistent vault at: ${UPLOAD_BASE}`);
          fs.mkdirSync(UPLOAD_BASE, { recursive: true, mode: 0o777 });
        }

        // 1. Write file
        fs.writeFileSync(uploadPath, buffer);
        fastify.log.info(`✅ Physical asset locked: ${newFilename}`);

        // 2. Update DB
        await db.execute('UPDATE users SET profile_picture_url = ? WHERE id = ?', [
          newFilename,
          id,
        ]);

        return reply.send({
          success: true,
          message: 'Profile identity updated',
          url: `/v1/users/${id}/profile-image`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        fastify.log.error(`❌ Infrastructure Failure: ${error.message}`);
        return reply.code(500).send({
          error: 'Infrastructure failure',
          details: error.message,
          path_attempted: uploadPath,
        });
      }
    }
  );

  /**
   * 🔱 GET /v1/users/:id/profile-image
   * Public-facing Asset Serving
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
      const filePath = path.join(UPLOAD_BASE, filename);

      if (!fs.existsSync(filePath)) {
        fastify.log.error(`❌ Missing asset at: ${filePath}`);

        let dirContents: string[] = [];
        try {
          if (fs.existsSync(UPLOAD_BASE)) {
            dirContents = fs.readdirSync(UPLOAD_BASE);
          }
        } catch (e) {
          // Ignore read errors for debug payload
        }

        const responsePayload: Record<string, string | string[]> = {
          error: 'Physical asset missing',
        };
        if (process.env.NODE_ENV === 'development') {
          responsePayload.debug_path = filePath;
        } else {
          // Forensic payload for production to diagnose Hostinger volatile FS
          responsePayload.path_attempted = filePath;
          responsePayload.dir_contents = dirContents;
        }
        return reply.code(404).send(responsePayload);
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
