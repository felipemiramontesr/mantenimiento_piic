import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
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
  passwordHash: z.string(),
  roleId: z.number(),
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
        'SELECT id, username, email, password_hash as passwordHash, role_id as roleId FROM users WHERE username = ?';
      const [rows] = await db.execute(query, [username]);

      const result = z.array(userDbSchema).safeParse(rows);
      const user = result.success ? result.data[0] : null;

      if (!user) {
        fastify.log.warn(`Unauthorized access attempt for user: ${username}`);
        return reply.code(401).send({ error: 'Unauthorized credentials' });
      }

      // 2. Verify Password
      const validPassword = await argon2.verify(user.passwordHash, password);
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
        roleId: user.roleId,
      });

      return reply.send({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: decryptedEmail,
          roleId: user.roleId,
        },
      });
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * 🔱 POST /v1/auth/register
   * Restricted: Admin/Archon (Conceptually)
   * Purpose: Securely enroll new personnel into the Archon Grid.
   */
  fastify.post('/register', async (request, reply) => {
    const registerSchema = z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z.number().int().default(2),
      fullName: z.string().optional(),
      department: z.string().optional(),
      employeeNumber: z.string().optional(),
    });

    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid registration data', details: body.error.format() });
    }

    const { username, email, password, roleId, fullName, department, employeeNumber } = body.data;

    try {
      // 1. Check for duplicate identity
      const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
      if ((existing as RowDataPacket[]).length > 0) {
        return reply.code(409).send({ error: `El usuario '${username}' ya está registrado.` });
      }

      // 2. Hash Password (Sovereign Security)
      const passwordHash = await argon2.hash(password);

      // 3. Encrypt Email (AES-256)
      const encryptedEmail = EncryptionService.encrypt(email);

      // 4. Persist to Sovereign Vault
      await db.execute(
        'INSERT INTO users (username, email, password_hash, role_id, full_name, department, employee_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, encryptedEmail, passwordHash, roleId, fullName, department, employeeNumber]
      );

      return reply.code(201).send({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Falla crítica durante el registro de identidad' });
    }
  });

  /**
   * 🔱 GET /v1/auth/users
   * Purpose: Retrieve active personnel for dispatch and maintenance assignments.
   */
  fastify.get('/users', async (request, reply) => {
    const { role } = request.query as { role?: string };

    try {
      let query = `
        SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
               u.full_name, u.department, u.employee_number, u.is_active
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (role) {
        query += ' AND u.role_id = ?';
        params.push(Number(role));
      }

      const [rows] = await db.execute(query, params);
      const users = (rows as RowDataPacket[]).map((u) => ({
        ...u,
        email: EncryptionService.decrypt(u.email),
      }));

      return reply.send({ success: true, count: users.length, data: users });
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Falla al listar el personal activo' });
    }
  });
}
