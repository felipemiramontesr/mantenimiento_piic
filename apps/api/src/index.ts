import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import telemetryRoutes from './routes/telemetry';
import fleetRoutes from './routes/fleet';

dotenv.config({ path: '../../.env' });

/**
 * 🔱 Archon API Factory: buildApp
 * Implementation: Silicon Valley Testable Architecture (v.17.0.0)
 */
const buildApp = (opts = {}): FastifyInstance => {
  const fastify = Fastify({
    logger: true,
    ...opts,
  });

  // Plugins Setup
  fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
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

  // Diagnostic Root V2 (Secure)
  fastify.get('/', async () => ({
    service: 'Archon API (Fleet Core)',
    version: '2.0.1-PROD',
    status: 'online',
    uptime: process.uptime(),
  }));

  // Health Check
  fastify.get(
    '/health',
    async (): Promise<{ status: string; timestamp: string }> => ({
      status: 'operational',
      timestamp: new Date().toISOString(),
    })
  );

  return fastify;
};

// Auto-start for production execution
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const server = buildApp();
  const start = async (): Promise<void> => {
    try {
      const port = Number(process.env.PORT) || 3001;
      await server.listen({ port, host: '0.0.0.0' });
      // eslint-disable-next-line no-console
      console.log(`✅ [Archon API] System Online at port ${port}`);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  start();
}

export default buildApp;
