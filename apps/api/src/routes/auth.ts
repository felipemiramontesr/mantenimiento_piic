import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';
import { EncryptionService } from '../services/encryption';
import argon2 from 'argon2';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid schema', details: body.error.format() });
    }

    const { username, password } = body.data;

    try {
      // 1. Fetch user from DB
      const [rows]: any = await db.execute(
        'SELECT id, username, email, password_hash, role_id FROM users WHERE username = ?',
        [username]
      );

      const user = rows[0];

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
        role_id: user.role_id 
      });

      return {
        status: 'success',
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: decryptedEmail,
          role_id: user.role_id 
        }
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
