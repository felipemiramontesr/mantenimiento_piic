import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import type { FastifyPluginCallback } from 'fastify';
import type { FastifyCookieOptions } from '@fastify/cookie';
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
import fleetTcoRoutes from './routes/fleetTco';
import fleetRecallsRoutes from './routes/fleetRecalls';
import fleetIntelligenceRoutes from './routes/fleetIntelligence';
import economicLifeRoutes from './routes/economicLife';
import anomalyDetectionRoutes from './routes/anomalyDetection';
import operatorScorecardRoutes from './routes/operatorScorecard';
import co2Routes from './routes/co2';
import recallsNhtsaRoutes from './routes/recallsNhtsa';
import recallsVimRoutes from './routes/recallsVim';
import notificationsRoutes from './routes/notifications';
import areasRoutes from './routes/areas';
import serviceCentersRoutes from './routes/serviceCenters';
import ownerProfileRoutes from './routes/ownerProfile';
import onboardingRoutes from './routes/onboarding';
import securityRoutes from './routes/security';
import realtimeTelemetryRoutes from './routes/realtimeTelemetry';
import crmContactsRoutes from './routes/crmContacts';
import crmContractsRoutes from './routes/crmContracts';
import crmPipelineRoutes from './routes/crmPipeline';
import crmInteractionsRoutes from './routes/crmInteractions';
import portalRoutes from './routes/portal';
import crmCampaignsRoutes from './routes/crmCampaigns';
import socialRoutes from './routes/social';
import reportsRoutes from './routes/reports';
import universeContextPlugin from './plugins/universeContext';
import {
  logSecurityEvent,
  recordHttpResponse,
  renderPrometheusMetrics,
} from './services/securityLog';
import cosmonautRolesRoutes from './routes/cosmonauts/rolesRoutes';
import cosmonautAssignmentsRoutes from './routes/cosmonauts/assignmentsRoutes';

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

// FC 062 F1 (A05) — explicit CORS allowlist in every environment: production is
// pinned to the configured frontend; non-production only reflects loopback origins.
// Evaluated per buildApp() call so NODE_ENV can vary between test apps.
const buildAllowedOrigins = (): Array<string | RegExp> =>
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL ?? 'https://mantenimiento.piic.com.mx']
    : [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

const buildApp = (opts: Record<string, unknown> = {}): FastifyInstance => {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB — allows up to 4 base64 JPEG images in fleet payload
    ...opts,
  });

  // Cookie plugin — must register before jwt for cookie-based token extraction
  fastify.register(cookie as unknown as FastifyPluginCallback<FastifyCookieOptions>);

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
        // FC 062 F1 (A05) — anti-clickjacking + plugin/base/form lockdown
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
  });

  fastify.register(cors, {
    origin: buildAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    credentials: true,
    maxAge: 86400,
    preflight: true,
  });

  fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod',
    cookie: { cookieName: 'refresh_token', signed: false },
    sign: { expiresIn: '15m' },
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

  // FC 062 F3 (A09) — global security observability: every response feeds the
  // /metrics counters; 401/403/429 emit a structured security event without
  // touching individual routes (route pattern preferred over raw URL — no params/PII).
  fastify.addHook('onResponse', async (request, reply) => {
    recordHttpResponse(reply.statusCode);
    const eventByStatus: Record<number, 'AUTH_FAILURE' | 'ACCESS_DENIED' | 'RATE_LIMIT'> = {
      401: 'AUTH_FAILURE',
      403: 'ACCESS_DENIED',
      429: 'RATE_LIMIT',
    };
    const event = eventByStatus[reply.statusCode];
    if (event) {
      const actor = request.user as { id?: number } | undefined;
      logSecurityEvent({
        event,
        route: request.routeOptions?.url ?? request.url.split('?')[0],
        method: request.method,
        actorId: actor?.id,
        ip: request.ip,
        statusCode: reply.statusCode,
      });
    }
  });

  // FC 062 F3 (A09) — Prometheus exposition mínima (L §12 parcial — limitación declarada)
  fastify.get('/metrics', async (_request, reply) =>
    reply.type('text/plain; version=0.0.4').send(renderPrometheusMetrics())
  );

  // FC 062 F1 (A05) — production-safe error handler (§8.2): unhandled 5xx never
  // leak internal messages or stack traces in production; 4xx keep Fastify's
  // default serialization (rate-limit 429, validation 400, jwt 401 untouched).
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled server error');
      const message =
        process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;
      return reply.code(statusCode).send({ success: false, code: 'INTERNAL_ERROR', message });
    }
    return reply.code(statusCode).send(error);
  });

  // FC-18 FaseC-1 — UniverseContext: global tenancy middleware (registered at root, before routes)
  fastify.register(universeContextPlugin);

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
  fastify.register(reportsRoutes, { prefix: '/v1' });
  fastify.register(notificationsRoutes, { prefix: '/v1' });
  fastify.register(areasRoutes, { prefix: '/v1' });
  fastify.register(serviceCentersRoutes, { prefix: '/v1' });
  fastify.register(ownerProfileRoutes, { prefix: '/v1' });
  fastify.register(onboardingRoutes, { prefix: '/v1' });
  fastify.register(securityRoutes, { prefix: '/v1' });
  fastify.register(realtimeTelemetryRoutes, { prefix: '/v1' });
  fastify.register(crmContactsRoutes, { prefix: '/v1' });
  fastify.register(crmContractsRoutes, { prefix: '/v1' });
  fastify.register(crmPipelineRoutes, { prefix: '/v1' });
  fastify.register(crmInteractionsRoutes, { prefix: '/v1' });
  fastify.register(portalRoutes, { prefix: '/v1' });
  fastify.register(crmCampaignsRoutes, { prefix: '/v1' });
  fastify.register(fleetTcoRoutes, { prefix: '/v1' });
  fastify.register(fleetRecallsRoutes, { prefix: '/v1' });
  fastify.register(fleetIntelligenceRoutes, { prefix: '/v1' });
  fastify.register(economicLifeRoutes, { prefix: '/v1' });
  fastify.register(anomalyDetectionRoutes, { prefix: '/v1' });
  fastify.register(operatorScorecardRoutes, { prefix: '/v1' });
  fastify.register(co2Routes, { prefix: '/v1' });
  fastify.register(recallsNhtsaRoutes, { prefix: '/v1' });
  fastify.register(recallsVimRoutes, { prefix: '/v1' });
  fastify.register(socialRoutes, { prefix: '/v1' });

  // Universe Namespace Routes — FC-18 FaseC-2 (Archon_Universe_Routing_Restructure)
  // Registers all domain routes under /v1/mantenimiento/ — original /v1/ aliases remain active.
  const universePrefix = '/v1/mantenimiento';
  fastify.register(fleetRoutes, { prefix: universePrefix });
  fastify.register(journeyRoutes, { prefix: universePrefix });
  fastify.register(userRoutes, { prefix: universePrefix });
  fastify.register(fleetMaintenanceRoutes, { prefix: universePrefix });
  fastify.register(financeRoutes, { prefix: universePrefix });
  fastify.register(adminRoutes, { prefix: universePrefix });
  fastify.register(alertsRoutes, { prefix: universePrefix });
  fastify.register(workOrderRoutes, { prefix: universePrefix });
  fastify.register(notificationsRoutes, { prefix: universePrefix });
  fastify.register(areasRoutes, { prefix: universePrefix });
  fastify.register(serviceCentersRoutes, { prefix: universePrefix });
  fastify.register(ownerProfileRoutes, { prefix: universePrefix });
  fastify.register(onboardingRoutes, { prefix: universePrefix });
  fastify.register(securityRoutes, { prefix: universePrefix });
  fastify.register(realtimeTelemetryRoutes, { prefix: universePrefix });
  fastify.register(crmContactsRoutes, { prefix: universePrefix });
  fastify.register(crmContractsRoutes, { prefix: universePrefix });
  fastify.register(crmPipelineRoutes, { prefix: universePrefix });
  fastify.register(crmInteractionsRoutes, { prefix: universePrefix });
  fastify.register(portalRoutes, { prefix: universePrefix });
  fastify.register(crmCampaignsRoutes, { prefix: universePrefix });
  fastify.register(fleetTcoRoutes, { prefix: universePrefix });
  fastify.register(fleetRecallsRoutes, { prefix: universePrefix });
  fastify.register(fleetIntelligenceRoutes, { prefix: universePrefix });
  fastify.register(economicLifeRoutes, { prefix: universePrefix });
  fastify.register(anomalyDetectionRoutes, { prefix: universePrefix });
  fastify.register(operatorScorecardRoutes, { prefix: universePrefix });
  fastify.register(co2Routes, { prefix: universePrefix });
  fastify.register(recallsNhtsaRoutes, { prefix: universePrefix });
  fastify.register(recallsVimRoutes, { prefix: universePrefix });
  fastify.register(socialRoutes, { prefix: universePrefix });
  fastify.register(catalogRoutes, { prefix: `${universePrefix}/catalogs` });
  fastify.register(geolocationRoutes, { prefix: `${universePrefix}/geolocation` });

  // FC24 FaseC — Cosmonaut routes (global; not duplicated under universePrefix)
  fastify.register(cosmonautRolesRoutes, { prefix: '/v1' });
  fastify.register(cosmonautAssignmentsRoutes, { prefix: '/v1' });

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
