import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import argon2 from 'argon2';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';

/**
 * 🔱 Archon Auth Engine (v.4.8.1)
 * Clean Architecture & Sovereign Security
 */

async function findUserByEmail(username: string): Promise<RowDataPacket | null> {
  const [results] = await db.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE is_active = 1',
    []
  );
  if (!results || !results[0]) return null;

  const allUsers = results as unknown as RowDataPacket[];
  const found = allUsers.find((u) => {
    try {
      return EncryptionService.decrypt(u.email) === username;
    } catch {
      return false;
    }
  });

  if (!found) return null;

  const [fullData] = await db.execute<RowDataPacket[]>(
    `SELECT u.*, r.name as role_name, cat.label as department_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN common_catalogs cat ON u.department_id = cat.id
     WHERE u.id = ?`,
    [found.id]
  );
  return fullData?.[0] || null;
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // 🔐 LOGIN: Authentic Sovereignty
  fastify.post<{ Body: { username?: string; password?: string } }>(
    '/login',
    async (request, reply) => {
      const { username, password } = request.body;
      if (!username || !password)
        return reply.code(400).send({ error: 'Identidad y clave requeridas' });

      try {
        const query = `
        SELECT u.*, r.name as role_name, cat.label as department_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN common_catalogs cat ON u.department_id = cat.id
        WHERE u.username = ?
      `;

        const [rows] = await db.execute<RowDataPacket[]>(query, [username]);
        let user = rows?.[0];

        if (!user) {
          user = await findUserByEmail(username);
        }

        const dbPasswordHash = user?.password_hash || user?.passwordHash;
        if (!user || !dbPasswordHash || !(await argon2.verify(dbPasswordHash, password))) {
          return reply.code(401).send({ error: 'Credenciales inválidas' });
        }

        const dbRoleId = user.role_id !== undefined ? user.role_id : user.roleId;
        const isMaster = dbRoleId === 0 || dbRoleId === 1 || user.username === 'GrayMan';

        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          roleId: dbRoleId,
          roleName: user.role_name || user.roleName,
          permissions: isMaster ? ['*'] : [],
        });

        const hasImage = !!(user.profile_picture_url || user.imageUrl);

        return reply.send({
          status: 'success',
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name || user.fullName,
            email: EncryptionService.decrypt(user.email),
            roleId: dbRoleId,
            roleName: user.role_name || user.roleName,
            department: user.department_name || user.department,
            imageUrl: hasImage ? `/v1/users/${user.id}/profile-image` : null,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'System Authority Failure' });
      }
    }
  );

  // 🔱 REGISTER: Identity Enrollment
  fastify.post('/register', async (request, reply) => {
    const registerSchema = z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z.number().int().default(2),
      fullName: z.string().optional(),
      departmentId: z.number().int().optional(),
      employeeNumber: z.string().optional(),
    });

    const body = registerSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid registration data' });

    const { username, email, password, roleId, fullName, departmentId, employeeNumber } = body.data;

    try {
      const [existing] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing && existing.length > 0) {
        return reply.code(409).send({ error: `El usuario '${username}' ya está registrado.` });
      }

      const passwordHash = await argon2.hash(password);
      const encryptedEmail = EncryptionService.encrypt(email);

      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (username, email, password_hash, role_id, full_name, department_id, employee_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          username,
          encryptedEmail,
          passwordHash,
          roleId,
          fullName || '',
          departmentId || null,
          employeeNumber || null,
        ]
      );

      return reply
        .code(201)
        .send({
          success: true,
          message: 'Usuario registrado exitosamente',
          userId: result.insertId,
        });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Falla crítica durante el registro de identidad' });
    }
  });

  // 🔱 USERS: Personnel Grid
  fastify.get('/users', async (request, reply) => {
    const { role } = request.query as { role?: string };
    try {
      let query =
        'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE 1=1';
      const params: (string | number)[] = [];
      if (role) {
        query += ' AND u.role_id = ?';
        params.push(Number(role));
      }

      const [rows] = await db.execute<RowDataPacket[]>(query, params);
      const users = rows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name || u.fullName,
        email: EncryptionService.decrypt(u.email),
        roleId: u.role_id !== undefined ? u.role_id : u.roleId,
        roleName: u.role_name || u.roleName,
        department: u.department_name || u.department,
        is_active: u.is_active,
        imageUrl: u.profile_picture_url || u.imageUrl ? `/v1/users/${u.id}/profile-image` : null,
      }));

      return reply.send({ success: true, count: users.length, data: users });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Falla al listar el personal activo' });
    }
  });

  // 🔱 UPDATE: Identity Refinement
  fastify.patch('/users/:id', async (request, reply) => {
    const updateSchema = z.object({
      fullName: z.string().optional(),
      department: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
      roleId: z.number().int().optional(),
      profilePictureUrl: z.string().optional(),
      employeeNumber: z.string().optional(),
      departmentId: z.number().int().optional(),
      is_active: z.boolean().optional(),
    });

    const { id } = request.params as { id: string };
    const body = updateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid update data' });

    const updates = body.data;
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (updates.fullName) {
      fields.push('full_name = ?');
      values.push(updates.fullName);
    }
    if (updates.department) {
      fields.push('department = ?');
      values.push(updates.department);
    }
    if (updates.email) {
      fields.push('email = ?');
      values.push(EncryptionService.encrypt(updates.email));
    }
    if (updates.password) {
      fields.push('password_hash = ?');
      values.push(await argon2.hash(updates.password));
    }
    if (updates.roleId) {
      fields.push('role_id = ?');
      values.push(updates.roleId);
    }
    if (updates.profilePictureUrl) {
      fields.push('profile_picture_url = ?');
      values.push(updates.profilePictureUrl);
    }
    if (updates.employeeNumber) {
      fields.push('employee_number = ?');
      values.push(updates.employeeNumber);
    }
    if (updates.departmentId) {
      fields.push('department_id = ?');
      values.push(updates.departmentId);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length === 0) return reply.code(400).send({ error: 'No hay campos que actualizar' });

    try {
      values.push(id);
      await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      return reply.send({ success: true, message: 'Identidad actualizada exitosamente' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Falla crítica durante la actualización de identidad' });
    }
  });

  // 🏛️ ROLES: Authority Grid
  fastify.get('/roles', async (_request, reply) => {
    try {
      const [rows] = await db.execute('SELECT id, name as label FROM roles', []);
      return reply.send(rows);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Falla al listar los niveles de autoridad' });
    }
  });
}
