import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import { reportSecurityEvent } from '../services/securityEvents.service';
import { BAIT_ROUTES } from './honeypot';

/**
 * FC201 F2 · HP1 — rutas carnada sobre la app completa (`buildApp`, con helmet, CORS y el rate limit
 * reales): así, si una carnada vuelve a llevar una cabecera que el 404 genérico no lleva, esto falla.
 */

vi.mock('../services/securityEvents.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/securityEvents.service')>()),
  reportSecurityEvent: vi.fn(),
}));

/** Una URL concreta que cae en cada entrada del catálogo (`/*` → un archivo cualquiera). */
const concreteUrl = (pattern: string): string => pattern.replace('/*', '/setup-config.php');

/** Cabeceras comparables: fuera solo las que cambian en cada respuesta. */
function comparableHeaders(res: LightMyRequestResponse): Record<string, unknown> {
  const { date: _date, ...rest } = res.headers;
  return rest;
}

let app: FastifyInstance;

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();
});

describe('T1.1 — clasificación de peticiones (Inv-1 · Inv-5)', () => {
  it.each(BAIT_ROUTES)(
    'fila 1 · %s: 404 idéntico al genérico (código, cabeceras y cuerpo)',
    async (pattern) => {
      const genuine = await app.inject({ method: 'GET', url: '/ruta-que-no-existe' });
      const bait = await app.inject({ method: 'GET', url: concreteUrl(pattern) });

      expect(bait.statusCode).toBe(404);
      expect(bait.body).toBe(genuine.body);
      expect(comparableHeaders(bait)).toEqual(comparableHeaders(genuine));
      expect(bait.headers).not.toHaveProperty('x-ratelimit-limit');
    }
  );

  it.each(BAIT_ROUTES)(
    'fila 1 · %s: registra BAIT_ROUTE con la entrada del catálogo (Inv-2)',
    async (pattern) => {
      await app.inject({ method: 'POST', url: `${concreteUrl(pattern)}?token=secreto` });

      expect(reportSecurityEvent).toHaveBeenCalledTimes(1);
      const [event] = (reportSecurityEvent as Mock).mock.calls[0];
      expect(event).toEqual({
        type: 'BAIT_ROUTE',
        ip: '127.0.0.1',
        targetPattern: pattern,
        sample: concreteUrl(pattern),
      });
    }
  );

  it('fila 2 · una ruta inexistente genuina responde el 404 plano y NO registra nada', async () => {
    const res = await app.inject({ method: 'GET', url: '/wp-content/uploads/x.php' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not Found' });
    expect(reportSecurityEvent).not.toHaveBeenCalled();
  });

  it('Inv-5 · la respuesta no delata la carnada: ni catálogo, ni evento, ni framework', async () => {
    const res = await app.inject({ method: 'GET', url: '/wp-login.php' });

    expect(res.body).not.toMatch(/honeypot|carnada|bait|trap|event|fastify|wp-/i);
  });

  it('un fallo al registrar se reporta al log del request, nunca al cliente', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/debug/env' });
    const [, onError] = (reportSecurityEvent as Mock).mock.calls[0];

    expect(() => onError(new Error('db down'))).not.toThrow();
    expect(res.json()).toEqual({ error: 'Not Found' });
  });
});

describe('B1 — 10 000 toques de la misma IP colapsan en una sola llave (Inv-2)', () => {
  it('cada toque a /wp-admin/<azar> reporta la MISMA llave (tipo, ip, carnada)', async () => {
    await Promise.all(
      Array.from({ length: 10_000 }, (_, n) =>
        app.inject({ method: 'GET', url: `/wp-admin/${n.toString(36)}.php` })
      )
    );

    const keys = new Set(
      (reportSecurityEvent as Mock).mock.calls.map(([event]) => {
        const { type, ip, targetPattern } = event as {
          type: string;
          ip: string;
          targetPattern: string;
        };
        return `${type}|${ip}|${targetPattern}`;
      })
    );
    expect(reportSecurityEvent).toHaveBeenCalledTimes(10_000);
    expect([...keys]).toEqual(['BAIT_ROUTE|127.0.0.1|/wp-admin/*']);
  }, 60_000);
});

describe('candado anti-falsos-positivos — nada legítimo apunta a una carnada', () => {
  const ROOTS = [path.resolve(__dirname, '..'), path.resolve(__dirname, '../../../web/src')];
  // Cada carnada sin comodín, y también como la escribiría la web (el cliente ya antepone `/v1`).
  const NEEDLES = BAIT_ROUTES.map((pattern) => pattern.replace('/*', '')).flatMap((p) =>
    p.startsWith('/v1/') ? [p, p.slice(3)] : [p]
  );

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  it('ningún archivo de api/web (salvo el propio catálogo) menciona una ruta carnada', () => {
    const offenders = ROOTS.flatMap(sourceFiles)
      .filter((file) => path.basename(file) !== 'honeypot.ts')
      .flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return NEEDLES.filter(
          (needle) => source.includes(`'${needle}`) || source.includes(`\`${needle}`)
        ).map((needle) => `${path.relative(process.cwd(), file)} → ${needle}`);
      });

    expect(offenders).toEqual([]);
  });
});
