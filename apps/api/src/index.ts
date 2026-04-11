import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import telemetryRoutes from './routes/telemetry';
import fleetRoutes from './routes/fleet';
import db from './services/db';

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

// Database Diagnostic
fastify.get('/health/db', async (request, reply) => {
  try {
    const [rows] = await db.execute('SELECT 1 as connected');
    return { status: 'connected', data: rows };
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    return reply.code(500).send({ 
       status: 'disconnected', 
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
