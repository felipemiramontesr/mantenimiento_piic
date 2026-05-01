import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import telemetryRoutes from './routes/telemetry';
import fleetRoutes from './routes/fleet';
import catalogRoutes from './routes/catalogs';
import userRoutes from './routes/users';

/* eslint-disable no-underscore-dangle */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

dotenv.config({ path: '../../.env' });

/**
 * 🔱 Archon API Factory: buildApp
 * Implementation: Silicon Valley Testable Architecture (v.17.0.0)
 */
const buildApp = (opts: Record<string, unknown> = {}): FastifyInstance => {
  const fastify = Fastify({
    logger: true,
    ...opts,
  });

  // Plugins Setup
  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    credentials: true,
    maxAge: 86400,
    preflight: true,
  });

  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret',
  });

  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 🔱 File Upload Protocol (Multipart)
  fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // 🔱 Static Assets Protocol (Serving Profile Pictures)
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/', // URL prefix
  });

  // Routes
  fastify.register(authRoutes, { prefix: '/v1/auth' });
  fastify.register(telemetryRoutes, { prefix: '/v1/archon' });
  fastify.register(fleetRoutes, { prefix: '/v1' });
  fastify.register(catalogRoutes, { prefix: '/v1/catalogs' });
  fastify.register(userRoutes, { prefix: '/v1' });

  // Diagnostic Root V2 (Secure)
  fastify.get(
    '/',
    async (): Promise<Record<string, string | number>> => ({
      service: 'Archon API (Fleet Core)',
      version: '2.0.1-PROD',
      status: 'online',
      uptime: process.uptime(),
    })
  );

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

// v8 ignore start
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
// v8 ignore stop

export default buildApp;
