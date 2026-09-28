import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import registerTrafficTaskScheduler, { TrafficTask } from './trafficTaskScheduler';

/**
 * FC200 F2 — programador por tráfico: RUN_t ≡ ¬BUSY_t ∧ DUE_t por tarea, sin retrasar la respuesta
 * y con el fallo de una tarea aislado de las demás (Inv-2).
 */

type Clock = { t: number };

function appWith(tasks: TrafficTask[], clock: Clock): ReturnType<typeof Fastify> {
  const app = Fastify();
  registerTrafficTaskScheduler(app, tasks, () => clock.t);
  app.get('/ping', async () => ({ ok: true }));
  return app;
}

/** Deja correr las promesas pendientes (las tareas van en segundo plano). */
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const task = (name: string, run: () => Promise<unknown>, intervalMs = 1000): TrafficTask => ({
  name,
  intervalMs,
  run,
});

describe('registerTrafficTaskScheduler', () => {
  it('fila 1 y 2: libre y vencida corre; dentro del intervalo espera; pasado el intervalo vuelve a correr', async () => {
    const run = vi.fn().mockResolvedValue({});
    const clock = { t: 5000 };
    const app = appWith([task('a', run)], clock);

    await app.inject({ url: '/ping' });
    await settle();
    clock.t += 999;
    await app.inject({ url: '/ping' });
    await settle();
    expect(run).toHaveBeenCalledTimes(1);

    clock.t += 1;
    await app.inject({ url: '/ping' });
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('fila 3: vencida pero todavía corriendo → no se duplica', async () => {
    let finish: () => void = () => undefined;
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const clock = { t: 5000 };
    const app = appWith([task('lenta', run)], clock);

    await app.inject({ url: '/ping' });
    clock.t += 5000;
    await app.inject({ url: '/ping' });
    expect(run).toHaveBeenCalledTimes(1);

    finish();
    await settle();
    await app.inject({ url: '/ping' });
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('cada tarea lleva su propio intervalo', async () => {
    const hourly = vi.fn().mockResolvedValue({});
    const fast = vi.fn().mockResolvedValue({});
    const clock = { t: 5000 };
    const app = appWith([task('hora', hourly, 3000), task('rapida', fast, 1000)], clock);

    await app.inject({ url: '/ping' });
    await settle();
    clock.t += 1000;
    await app.inject({ url: '/ping' });
    await settle();

    expect(hourly).toHaveBeenCalledTimes(1);
    expect(fast).toHaveBeenCalledTimes(2);
  });

  it('Inv-2: una tarea que falla no impide las demás ni la respuesta; el fallo se registra con su nombre', async () => {
    const broken = vi.fn().mockRejectedValue(new Error('db caída'));
    const healthy = vi.fn().mockResolvedValue({ purged: 0 });
    const app = appWith([task('rota', broken), task('sana', healthy)], { t: 5000 });
    const logError = vi.spyOn(app.log, 'error');
    const logInfo = vi.spyOn(app.log, 'info');

    const res = await app.inject({ url: '/ping' });
    await settle();

    expect(res.statusCode).toBe(200);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'rota', err: expect.any(Error) }),
      'Traffic task failed'
    );
    expect(logInfo).toHaveBeenCalledWith(
      { task: 'sana', report: { purged: 0 } },
      'Traffic task done'
    );
  });

  it('Inv-2: una tarea lenta no retrasa la respuesta', async () => {
    const neverEnds = vi.fn(
      () =>
        new Promise<void>(() => {
          // nunca resuelve: simula una tarea colgada
        })
    );
    const app = appWith([task('eterna', neverEnds)], { t: 5000 });

    const res = await app.inject({ url: '/ping' });

    expect(res.statusCode).toBe(200);
    expect(neverEnds).toHaveBeenCalledTimes(1);
  });

  it('sin tareas: no hace nada y responde normal', async () => {
    const app = appWith([], { t: 5000 });

    expect((await app.inject({ url: '/ping' })).statusCode).toBe(200);
  });
});
