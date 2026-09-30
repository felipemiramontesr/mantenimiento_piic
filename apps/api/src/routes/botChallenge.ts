import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { botChallengeVerifier, BotChallenge } from '../services/botChallenge.service';

/**
 * FC199 F3 — `GET /v1/public/bot-challenge`: emite un reto PoW (anónimo, sin estado, sin DB). El
 * límite por IP evita que alguien lo use para gastar CPU del servidor firmando retos.
 */
export default function botChallengeRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.get(
    '/bot-challenge',
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'production' ? 30 : 1000,
          timeWindow: '1 minute',
        },
      },
    },
    async (_request, reply): Promise<BotChallenge> => {
      reply.header('Cache-Control', 'no-store');
      return botChallengeVerifier.issue();
    }
  );
  done();
}
