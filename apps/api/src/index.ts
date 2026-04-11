import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import telemetryRoutes from './routes/telemetry';
import fleetRoutes from './routes/fleet';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({
  logger: true,
});

// Plugins Setup
fastify.register(cors, {
  origin: [
    'https://mantenimiento.piic.com.mx',
    'http://localhost:5173', // Para desarrollo local
    'http://localhost:4173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
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

// Health Check
fastify.get(
  '/health',
  async (): Promise<{ status: string; timestamp: string }> => ({
    status: 'operational',
    timestamp: new Date().toISOString(),
  })
);

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
