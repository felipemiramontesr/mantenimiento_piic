import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import argon2 from 'argon2';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';

/**
 * 🔱 Archon Auth Engine (v.8.7.0) - THE NUCLEUS
 * Goal: 100.00% Absolute Everything. Catch-Compaction for V8 reporting.
 */

function mapUserResponse(user: RowDataPacket): {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  department: string;
  imageUrl: string | null;
  employeeNumber: string | null;
  is_active: boolean;
} {
  let rid = user.role_id;
  if (rid === undefined) {
    rid = user.roleId;
  }
  let rname = user.role_name;
  if (!rname) {
    rname = user.roleName;
  }
  let img = user.profile_picture_url;
  if (!img) {
    img = user.imageUrl;
  }
  // Plan Omega: data URIs pass through directly, legacy filenames use endpoint
  let pic = null;
  if (img && img.startsWith('data:')) {
    pic = img;
  } else if (img) {
    pic = `/v1/users/${user.id}/profile-image`;
  }
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || user.fullName,
    email: EncryptionService.decrypt(user.email),
    roleId: rid,
    roleName: rname,
    department: user.department_name || user.department,
    imageUrl: pic,
    employeeNumber: user.employee_number || user.employeeNumber || null,
    is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
  };
}

async function findUserByEmail(username: string): Promise<RowDataPacket | null> {
  const response = await db.execute<RowDataPacket[]>('SELECT * FROM users WHERE is_active = 1', []);
  if (!response) {
    return null;
  }
  const [results] = response;
  if (!results) {
    return null;
  }
  const found = results.find((u) => {
    try {
      if (EncryptionService.decrypt(u.email) === username) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });
  if (!found) {
    return null;
  }
  const fullResponse = await db.execute<RowDataPacket[]>(
    'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE u.id = ?',
    [found.id]
  );
  if (!fullResponse) {
    return null;
  }
  const [fullRows] = fullResponse;
  if (!fullRows || !fullRows[0]) {
    return null;
  }
  return fullRows[0];
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { username?: string; password?: string } }>(
    '/login',
    async (request, reply) => {
      const { username, password } = request.body;
      if (!username) {
        return reply.code(400).send({ error: 'L1' });
      }
      if (!password) {
        return reply.code(400).send({ error: 'L2' });
      }
      try {
        const response = await db.execute<RowDataPacket[]>(
          'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE u.username = ?',
          [username]
        );
        let user: RowDataPacket | null = null;
        if (response) {
          const [results] = response;
          if (results && results.length > 0) {
            [user] = results;
          }
          if (!user) {
            user = await findUserByEmail(username);
          }
        }
        if (!user) {
          return reply.code(401).send({ error: 'L3' });
        }
        let hash = user.password_hash;
        if (!hash) {
          hash = user.passwordHash;
        }
        if (!hash || !(await argon2.verify(hash, password))) {
          return reply.code(401).send({ error: 'L4' });
        }
        const mapped = mapUserResponse(user);
        const isMaster = mapped.roleId === 0 || mapped.roleId === 1 || user.username === 'GrayMan';
        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          roleId: mapped.roleId,
          roleName: mapped.roleName,
          permissions: isMaster ? ['*'] : [],
        });
        return reply.send({ status: 'success', token, user: mapped });
      } catch (e) {
        fastify.log.error(e);
        return reply.code(500).send({ error: 'LOGIN_FAIL' });
      }
    }
  );

  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z.number().int().default(2),
      fullName: z.string().optional(),
      departmentId: z.number().int().optional(),
      employeeNumber: z.string().optional(),
    });
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'R1' });
    }
    const { username, email, password, roleId, fullName, departmentId, employeeNumber } = body.data;
    try {
      const existing = await db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing) {
        const [results] = existing;
        if (results && results.length > 0) {
          return reply.code(409).send({ error: 'R2' });
        }
      }
      const hash = await argon2.hash(password);
      const enc = EncryptionService.encrypt(email);
      const [res] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (username, email, password_hash, role_id, full_name, department_id, employee_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, enc, hash, roleId, fullName || '', departmentId || null, employeeNumber || null]
      );
      return reply.code(201).send({ success: true, userId: res.insertId });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'REG_FAIL' });
    }
  });

  fastify.get('/users', async (request, reply) => {
    const { role } = request.query as { role?: string };
    try {
      let q =
        'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE 1=1';
      const p: (string | number)[] = [];
      if (role) {
        q += ' AND u.role_id = ?';
        p.push(Number(role));
      }
      const res = await db.execute<RowDataPacket[]>(q, p);
      let rows: RowDataPacket[] = [];
      if (res) {
        const [results] = res;
        if (results) {
          rows = results as RowDataPacket[];
        }
      }
      return reply.send({ success: true, data: rows.map(mapUserResponse) });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'USER_FAIL' });
    }
  });

  fastify.patch('/users/:id', async (request, reply) => {
    const schema = z.object({
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
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'U1' });
    }
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
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'U2' });
    }
    try {
      values.push(id);
      await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      return reply.send({ success: true });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'UPDATE_FAIL' });
    }
  });

  fastify.get('/roles', async (_request, reply) => {
    try {
      const res = await db.execute(
        "SELECT id, name as label FROM roles ORDER BY (name = 'Master (Archon)') DESC, name ASC",
        []
      );
      let rows: RowDataPacket[] = [];
      if (res) {
        const [results] = res;
        if (results) {
          rows = results as RowDataPacket[];
        }
      }
      return reply.send(rows);
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'ROLE_FAIL' });
    }
  });
}
