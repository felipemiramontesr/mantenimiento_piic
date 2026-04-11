import { FastifyInstance } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const userDbSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  role_id: z.number(),
});

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid schema', details: body.error.format() });
    }

    const { username, password } = body.data;

    try {
      // 1. Fetch user from DB
      const query =
        'SELECT id, username, email, password_hash, role_id FROM users WHERE username = ?';
      const [rows] = await db.execute(query, [username]);

      const result = z.array(userDbSchema).safeParse(rows);
      const user = result.success ? result.data[0] : null;

      if (!user) {
        fastify.log.warn(`Unauthorized access attempt for user: ${username}`);
        return reply.code(401).send({ error: 'Unauthorized credentials' });
      }

      // 2. Verify Password
      const validPassword = await argon2.verify(user.password_hash, password);
      if (!validPassword) {
        fastify.log.warn(`Invalid password for user: ${username}`);
        return reply.code(401).send({ error: 'Unauthorized credentials' });
      }

      // 3. Decrypt Sensitive Data (Email)
      const decryptedEmail = EncryptionService.decrypt(user.email);

      // 4. Generate Token
      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        role_id: user.role_id,
      });

      return reply.send({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: decryptedEmail,
          role_id: user.role_id,
        },
      });
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      fastify.log.error(error);
      return reply.code(500).send({ 
        error: 'Internal Server Error', 
        message: error.message, // Revelation for debugging
        code: error.code 
      });
    }
  });
}
