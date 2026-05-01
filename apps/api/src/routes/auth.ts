import { FastifyInstance } from 'fastify';
import * as argon2 from 'argon2';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

interface LoginBody {
  username?: string;
  password?: string;
}

/**
 * 🔱 Archon Auth Engine (v.4.0.0)
 * Optimized for Industrial Normalization
 */
export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // 🔐 LOGIN: Authentic Sovereignty
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { username, password } = request.body;

    try {
      const query = `
        SELECT u.*, r.name as role_name, cat.label as department_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN common_catalogs cat ON u.department_id = cat.id
        WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
      `;

      const [rows] = await db.execute<RowDataPacket[]>(query, [username, username]);
      const user = rows[0];

      if (!user || !(await argon2.verify(user.password_hash, password))) {
        return reply.code(401).send({ error: 'Credenciales inválidas' });
      }

      // 🛡️ Omega Bypass Strategy
      // Si el rol es Master (ID 1), otorgamos permisos absolutos inmediatamente
      const isMaster = user.role_id === 1;

      const token = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        roleId: user.role_id,
        roleName: user.role_name,
        permissions: isMaster ? ['*'] : [],
      });

      return reply.send({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          roleId: user.role_id,
          roleName: user.role_name,
          department: user.department_name,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'System Authority Failure' });
    }
  });

  // 🏛️ ROLES: Authority Grid
  fastify.get('/roles', async (_request, reply) => {
    const [rows] = await db.execute('SELECT id, name as label FROM roles ORDER BY id ASC');
    return reply.send(rows);
  });
}
