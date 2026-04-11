import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import telemetryRoutes from './routes/telemetry';
import fleetRoutes from './routes/fleet';
import db from './services/db';
import argon2 from 'argon2';
import EncryptionService from './services/encryption';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({
  logger: true,
});

// Plugins Setup
fastify.register(cors, {
  origin: '*', // Most compatible with simple proxies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // Not needed for JWT Bearer tokens
  optionsSuccessStatus: 204,
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret',
});

fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Routes
fastify.register(authRoutes, { prefix: '/v1/auth' });
fastify.register(telemetryRoutes, { prefix: '/v1/archon' });
fastify.register(fleetRoutes, { prefix: '/v1' });

// Diagnostic Root V2
fastify.get('/', async () => ({ 
  service: 'Archon API (Fleet Core)', 
  version: '2.0.0-PROD', 
  status: 'online',
  timestamp: new Date().toISOString() 
}));

// Health Check
fastify.get(
  '/health',
  async (): Promise<{ status: string; timestamp: string }> => ({
    status: 'operational',
    timestamp: new Date().toISOString(),
  })
);

// Master System Setup (Temporary for Production Launch)
fastify.get('/v1/sys/setup', async (request, reply) => {
  try {
    console.log('🏁 [Archon Setup] Starting database initialization...');

    // 1. Create Tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT DEFAULT 1,
        avatar_url TEXT,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )
    `);

    // 2. Seed Roles
    await db.execute(`
      INSERT IGNORE INTO roles (id, name, description) VALUES 
      (0, 'Archon', 'Master system administrator'),
      (1, 'Operator', 'Standard user'),
      (2, 'Manager', 'Fleet manager')
    `);

    // 3. Seed Master User
    const passwordHash = await argon2.hash('pinnacle2026');
    const encryptedEmail = EncryptionService.encrypt('admin@piic.com.mx');
    
    await db.execute(
      'INSERT IGNORE INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      ['archon', encryptedEmail, passwordHash, 0]
    );

    return { 
      status: 'success', 
      message: 'Archon System Initialized Successfully',
      gateway: 'Production V2'
    };
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    return reply.code(500).send({ 
      status: 'setup_failed', 
      error: error.message,
      code: error.code 
    });
  }
});

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    // eslint-disable-next-line no-console
    console.log(`✅ [Archon API] System Online at port ${port}`);
    // eslint-disable-next-line no-console
    console.log(`📡 CORS Policy: Permissive (*)`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
