import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { telemetryRoutes } from './routes/telemetry';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({
  logger: true,
});

// Plugins Setup
fastify.register(cors, {
  origin: '*', // Strict in production
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

// Health Check
fastify.get('/health', async () => ({ status: 'operational', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Archon Core API running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
