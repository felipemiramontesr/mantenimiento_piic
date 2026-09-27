import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import registerHousekeepingTrigger from './housekeepingTrigger';

/**
 * FC199 F4 — el barrido corre tras una respuesta, como máximo una vez por intervalo y nunca dos a la
 * vez; no retrasa la respuesta y un fallo solo se registra.
 */

function appWith(run: () => Promise<unknown>, clock: { t: number }): ReturnType<typeof Fastify> {
  const app = Fastify();
  registerHousekeepingTrigger(app, { run, intervalMs: 1000, now: () => clock.t });
  app.get('/ping', async () => ({ ok: true }));
  return app;
}

/** Deja correr las promesas pendientes (el barrido va en segundo plano). */
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('registerHousekeepingTrigger', () => {
  it('la primera respuesta dispara el barrido; las siguientes dentro del intervalo no', async () => {
    const run = vi.fn().mockResolvedValue({ purgedAccounts: 0 });
    const clock = { t: 5000 };
    const app = appWith(run, clock);

    await app.inject({ url: '/ping' });
    await settle();
    clock.t += 999;
    await app.inject({ url: '/ping' });
    await settle();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('pasado el intervalo, la siguiente respuesta vuelve a dispararlo', async () => {
    const run = vi.fn().mockResolvedValue({});
    const clock = { t: 5000 };
    const app = appWith(run, clock);

    await app.inject({ url: '/ping' });
    await settle();
    clock.t += 1000;
    await app.inject({ url: '/ping' });
    await settle();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('nunca dos a la vez: mientras uno corre, otra respuesta no lanza otro aunque venza el intervalo', async () => {
    let finish: () => void = () => undefined;
    const run = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const clock = { t: 5000 };
    const app = appWith(run, clock);

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

  it('no retrasa la respuesta y un fallo del barrido no rompe nada (solo se registra)', async () => {
    const run = vi.fn().mockRejectedValue(new Error('db caída'));
    const app = appWith(run, { t: 5000 });
    const logError = vi.spyOn(app.log, 'error');

    const res = await app.inject({ url: '/ping' });
    await settle();

    expect(res.statusCode).toBe(200);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Auth housekeeping sweep failed'
    );
  });

  it('una corrida exitosa deja su reporte en el log', async () => {
    const run = vi.fn().mockResolvedValue({ purgedAccounts: 2 });
    const app = appWith(run, { t: 5000 });
    const logInfo = vi.spyOn(app.log, 'info');

    await app.inject({ url: '/ping' });
    await settle();

    expect(logInfo).toHaveBeenCalledWith(
      { report: { purgedAccounts: 2 } },
      'Auth housekeeping sweep'
    );
  });
});
