import { FastifyInstance } from 'fastify';

/**
 * FC199 F4 — disparo del barrido de higiene por TRÁFICO, no por reloj. Medido en prod: el proceso
 * de la API en Hostinger se duerme sin tráfico y `node-cron` no disparó (un nonce vencido a las
 * 10:44 seguía ahí tras las 14:15 y las 15:15). Aquí, tras enviar una respuesta, si pasó al menos
 * `intervalMs` desde la última corrida, se lanza el barrido en segundo plano (no retrasa a nadie).
 * Sin tráfico no se crean nonces, contadores ni cuentas, así que no hay nada que acumular; una
 * cuenta vencida se purga con la siguiente visita. Una sola corrida a la vez por proceso.
 */

export interface HousekeepingTriggerOptions {
  readonly run: () => Promise<unknown>;
  readonly intervalMs?: number;
  readonly now?: () => number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Registra el hook `onResponse` que dispara `run` como máximo una vez por `intervalMs`. */
export default function registerHousekeepingTrigger(
  fastify: FastifyInstance,
  { run, intervalMs = ONE_HOUR_MS, now = Date.now }: HousekeepingTriggerOptions
): void {
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  let running = false;

  fastify.addHook('onResponse', async () => {
    const startedAt = now();
    if (running || startedAt - lastStartedAt < intervalMs) return;
    running = true;
    lastStartedAt = startedAt;
    run()
      .then((report) => fastify.log.info({ report }, 'Auth housekeeping sweep'))
      .catch((err: unknown) => fastify.log.error({ err }, 'Auth housekeeping sweep failed'))
      .finally(() => {
        running = false;
      });
  });
}
