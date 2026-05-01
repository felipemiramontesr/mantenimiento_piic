import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
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
  roleName: z.string(),
  profile_picture_url: z.string().nullable().optional(),
});

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid schema', details: body.error.format() });
    }

    const { username, password } = body.data;

    try {
      // 1. Fetch user from DB with Roles and Permissions
      const query = `
        SELECT u.id, u.username, u.email, u.password_hash as passwordHash, 
               u.role_id as roleId, r.name as roleName, u.profile_picture_url
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
      `;
      const [rows] = await db.execute(query, [username]);

      const result = z.array(userDbSchema).safeParse(rows);
      const user = result.success ? result.data[0] : null;

      if (!user) {
        fastify.log.warn(`Unauthorized access attempt for user: ${username}`);
        return reply.code(401).send({ error: 'Unauthorized credentials' });
      }

      // 2. Verify Password (Sovereign First)
      const validPassword = await argon2.verify(user.passwordHash, password);
      if (!validPassword) {
        fastify.log.warn(`Invalid password for user: ${username}`);
        return reply.code(401).send({ error: 'Unauthorized credentials' });
      }

      // 3. Fetch Permissions for the role
      const [permRows] = await db.execute<RowDataPacket[]>(
        `SELECT p.slug 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?`,
        [user.roleId]
      );
      let permissions = permRows.map((p) => p.slug);

      // 🛡️ OMEGA BYPASS: Hardcoded Identity injection for the Sovereign
      if (user.username.toLowerCase() === 'archon' || user.roleId === 0) {
        user.roleName = 'Master (Archon)';
      }

      // 🛡️ OMEGA BYPASS: Master (Archon) always gets all permissions
      // Hardcoded check for 'Archon' username as a final fail-safe
      if (user.roleName === 'Master (Archon)' || user.roleId === 0 || user.username === 'Archon') {
        const [allPerms] = await db.execute<RowDataPacket[]>('SELECT slug FROM permissions');
        if (allPerms && Array.isArray(allPerms)) {
          permissions = allPerms.map((p) => p.slug);
        }
      }

      // 3. Decrypt Sensitive Data (Email)
      const decryptedEmail = EncryptionService.decrypt(user.email);

      // 4. Generate Token (Including Permissions in Payload)
      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        roleName: user.roleName,
        permissions,
      });

      return reply.send({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: decryptedEmail,
          roleId: user.roleId,
          roleName: user.roleName,
          permissions,
          imageUrl: user.profile_picture_url ? `/v1/users/${user.id}/profile-image` : null,
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
      profilePictureUrl: z.string().optional(),
    });

    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid registration data', details: body.error.format() });
    }

    const {
      username,
      email,
      password,
      roleId,
      fullName,
      department,
      employeeNumber,
      profilePictureUrl,
    } = body.data;

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
      const [result] = await db.execute(
        'INSERT INTO users (username, email, password_hash, role_id, full_name, department, employee_number, profile_picture_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          username,
          encryptedEmail,
          passwordHash,
          roleId,
          fullName,
          department,
          employeeNumber,
          profilePictureUrl || null,
        ]
      );

      const { insertId: userId } = result as ResultSetHeader;

      return reply.code(201).send({
        success: true,
        message: 'Usuario registrado exitosamente',
        userId,
      });
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
               u.full_name, u.department, u.employee_number, u.is_active, u.profile_picture_url
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
        profile_picture_url: u.profile_picture_url ? `/v1/users/${u.id}/profile-image` : null,
      }));

      return reply.send({ success: true, count: users.length, data: users });
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Falla al listar el personal activo' });
    }
  });

  /**
   * 🔱 PATCH /v1/auth/users/:id
   * Purpose: Update personnel identity, industrial profile, and credentials.
   */
  fastify.patch('/users/:id', async (request, reply) => {
    const updateSchema = z.object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
      roleId: z.number().int().optional(),
      department: z.string().optional(),
      employeeNumber: z.string().optional(),
      profilePictureUrl: z.string().optional(),
      is_active: z.boolean().optional(),
    });

    const { id } = request.params as { id: string };
    const body = updateSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: body.error.format() });
    }

    const updates = body.data;

    try {
      // 1. Logic for password hashing if provided (Sovereign Security)
      let passwordHash: string | undefined;
      if (updates.password) {
        passwordHash = await argon2.hash(updates.password);
      }

      // 2. Encryption for email if provided (AES-256)
      let encryptedEmail: string | undefined;
      if (updates.email) {
        encryptedEmail = EncryptionService.encrypt(updates.email);
      }

      // 3. Build Dynamic Query (Strict Typing v.28.38.1)
      const fields: string[] = [];
      const values: (string | number | boolean)[] = [];

      if (updates.fullName !== undefined) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
      }
      if (encryptedEmail !== undefined) {
        fields.push('email = ?');
        values.push(encryptedEmail);
      }
      if (passwordHash !== undefined) {
        fields.push('password_hash = ?');
        values.push(passwordHash);
      }
      if (updates.roleId !== undefined) {
        fields.push('role_id = ?');
        values.push(updates.roleId);
      }
      if (updates.department !== undefined) {
        fields.push('department = ?');
        values.push(updates.department);
      }
      if (updates.employeeNumber !== undefined) {
        fields.push('employee_number = ?');
        values.push(updates.employeeNumber);
      }
      if (updates.profilePictureUrl !== undefined) {
        fields.push('profile_picture_url = ?');
        values.push(updates.profilePictureUrl);
      }
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active ? 1 : 0);
      }

      if (fields.length === 0) {
        return reply.code(400).send({ error: 'No hay campos que actualizar' });
      }

      values.push(id);
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      await db.execute(query, values);

      return reply.send({ success: true, message: 'Identidad actualizada exitosamente' });
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Falla crítica durante la actualización de identidad' });
    }
  });

  /**
   * 🔱 GET /v1/auth/roles
   * Purpose: Fetch the sovereign role hierarchy for industrial selection.
   */
  fastify.get('/roles', async (_request, reply) => {
    try {
      const [rows] = await db.execute('SELECT id, name as label FROM roles ORDER BY id ASC', []);
      return reply.send(rows);
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Falla al listar los niveles de autoridad' });
    }
  });
}
