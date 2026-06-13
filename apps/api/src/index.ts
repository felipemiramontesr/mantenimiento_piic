import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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
import journeyRoutes from './routes/fleetRoutes';
import catalogRoutes from './routes/catalogs';
import userRoutes from './routes/users';
import geolocationRoutes from './routes/geolocation';
import fleetMaintenanceRoutes from './routes/fleetMaintenance';
import financeRoutes from './routes/finance';
import adminRoutes from './routes/admin';
import alertsRoutes from './routes/alerts';
import workOrderRoutes from './routes/workOrders';
import notificationsRoutes from './routes/notifications';

/* eslint-disable no-underscore-dangle */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

dotenv.config({ path: '../../.env' });

/**
 * 🔱 Archon API Factory: buildApp
 * Implementation: Silicon Valley Testable Architecture (v.17.0.0)
 */
// Fail-fast: critical secrets must be present in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is required in production');
  if (!process.env.DB_ENCRYPTION_KEY)
    throw new Error('DB_ENCRYPTION_KEY env var is required in production');
}

const ALLOWED_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL ?? 'https://mantenimiento.piic.com.mx']
    : true;

const buildApp = (opts: Record<string, unknown> = {}): FastifyInstance => {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB — allows up to 4 base64 JPEG images in fleet payload
    ...opts,
  });

  // Security headers — must register before cors
  fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
  });

  fastify.register(cors, {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    credentials: true,
    maxAge: 86400,
    preflight: true,
  });

  fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod',
  });

  // 🔱 Rate Limiting: Environment-Aware Shield
  fastify.register(rateLimit, {
    max: process.env.NODE_ENV === 'development' ? 5000 : 100,
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
  fastify.register(journeyRoutes, { prefix: '/v1' });
  fastify.register(catalogRoutes, { prefix: '/v1/catalogs' });
  fastify.register(userRoutes, { prefix: '/v1' });
  fastify.register(geolocationRoutes, { prefix: '/v1/geolocation' });
  fastify.register(fleetMaintenanceRoutes, { prefix: '/v1' });
  fastify.register(financeRoutes, { prefix: '/v1' });
  fastify.register(adminRoutes, { prefix: '/v1' });
  fastify.register(alertsRoutes, { prefix: '/v1' });
  fastify.register(workOrderRoutes, { prefix: '/v1' });
  fastify.register(notificationsRoutes, { prefix: '/v1' });

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

      // UPA Stage-5 timeout sweep — every hour on the hour
      const cron = await import('node-cron');
      const { checkAndTimeoutStage5Orders } = await import('./services/workOrderService');
      const { processPendingAlerts } = await import('./services/notificationsOutboxService');
      cron.schedule('0 * * * *', () => {
        checkAndTimeoutStage5Orders().catch((err: unknown) => {
          server.log.error({ err }, 'UPA stage5 timeout sweep failed');
        });
      });
      // Slow-state push alerts: OPEN orders > 2h, ACTIVE orders > 48h
      cron.schedule('0 * * * *', () => {
        processPendingAlerts().catch((err: unknown) => {
          server.log.error({ err }, 'Outbox pending alerts sweep failed');
        });
      });
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  start();
}
// v8 ignore stop

export default buildApp;
