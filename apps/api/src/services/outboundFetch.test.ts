import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';
import * as https from 'https';
import { EventEmitter } from 'events';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  OUTBOUND_ALLOWLIST,
  outboundAllowed,
  isPrivateIp,
  outboundFetch,
  resetOutboundState,
  getBreaker,
  CircuitBreaker,
  SsrfBlockedError,
  BreakerOpenError,
  type OutboundRequestFn,
} from './outboundFetch';
import { resetSecurityMetrics, renderPrometheusMetrics } from './securityLog';

// `https.request` es un export ESM no configurable -- `vi.spyOn` no puede
// reemplazarlo (a diferencia de `dns.promises.lookup`, una propiedad de
// objeto plano). `vi.mock` sí puede sustituir el export completo del módulo.
vi.mock('https', async (importOriginal) => {
  const actual = await importOriginal<typeof import('https')>();
  return { ...actual, request: vi.fn() };
});

/**
 * 🔱 FC 062 F4 — A10_SSRF_Guard (Scenarios 4 y 5 · T1 8 filas · T3)
 * Requisitos v1.1 (dictamen Alfa + Bravo): (a) sin redirects nativos ·
 * (b) resolución host→IP previa · (c) conexión a IP con header Host ·
 * (d) validación anti-IP-privada sobre la resolución final.
 */

const okTransport =
  (capture?: Record<string, unknown>): OutboundRequestFn =>
  async (options) => {
    if (capture) Object.assign(capture, options);
    return { status: 200, headers: {}, body: Buffer.from('{"ok":true}') };
  };

const NHTSA = `https://${OUTBOUND_ALLOWLIST[0]}/recalls/recallsByVehicle?make=ford`;
const publicResolver = async (): Promise<string[]> => ['93.184.216.34'];

describe('T1 — OutboundAllowed (8 filas · A=allowlist · B=https · C=¬PrivateIP)', () => {
  it.each([
    [true, true, true, true],
    [true, true, false, false],
    [true, false, true, false],
    [true, false, false, false],
    [false, true, true, false],
    [false, true, false, false],
    [false, false, true, false],
    [false, false, false, false],
  ])('fila A=%s B=%s C=%s → %s', (a, b, c, expected) => {
    expect(outboundAllowed(a, b, c)).toBe(expected);
  });
});

describe('isPrivateIp — variable C sobre la resolución final', () => {
  it.each([
    ['10.0.0.1', true],
    ['127.0.0.1', true],
    ['169.254.1.1', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['172.15.0.1', false],
    ['172.32.0.1', false],
    ['192.168.1.1', true],
    ['100.64.0.1', true],
    ['0.0.0.0', true],
    ['8.8.8.8', false],
    ['93.184.216.34', false],
    ['::1', true],
    ['::', true],
    ['fe80::1', true],
    ['fc00::1', true],
    ['fdff::1', true],
    ['2001:4860:4860::8888', false],
    ['::ffff:10.0.0.1', true],
    ['::ffff:8.8.8.8', false],
  ])('%s → private=%s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });
});

describe('outboundFetch — pipeline SSRF (Scenario 4)', () => {
  beforeEach(() => {
    resetOutboundState();
    resetSecurityMetrics();
  });

  it('F4-1 (A⊥): host fuera de allowlist se rechaza sin conectar y se loguea SSRF_BLOCKED', async () => {
    let transportCalled = false;
    const transport: OutboundRequestFn = async () => {
      transportCalled = true;
      return { status: 200, headers: {}, body: Buffer.alloc(0) };
    };
    await expect(
      outboundFetch(
        'https://evil.example.com/x',
        {},
        { resolve: publicResolver, request: transport }
      )
    ).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(transportCalled).toBe(false);
    expect(renderPrometheusMetrics()).toContain(
      'archon_security_events_total{event="SSRF_BLOCKED"} 1'
    );
  });

  it('F4-2 (B⊥): http hacia host permitido se rechaza (downgrade)', async () => {
    await expect(
      outboundFetch(
        `http://${OUTBOUND_ALLOWLIST[0]}/x`,
        {},
        { resolve: publicResolver, request: okTransport() }
      )
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('F4-3 (C⊥ — DNS rebinding): host permitido que resuelve a IP privada se rechaza sin conectar', async () => {
    let transportCalled = false;
    const transport: OutboundRequestFn = async () => {
      transportCalled = true;
      return { status: 200, headers: {}, body: Buffer.alloc(0) };
    };
    await expect(
      outboundFetch(NHTSA, {}, { resolve: async () => ['192.168.1.50'], request: transport })
    ).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(transportCalled).toBe(false);
  });

  it('F4-4 (d): basta UNA IP privada en la resolución para rechazar (rebinding roulette)', async () => {
    await expect(
      outboundFetch(
        NHTSA,
        {},
        { resolve: async () => ['93.184.216.34', '10.0.0.9'], request: okTransport() }
      )
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('F4-5 (b)(c): conecta a la IP resuelta con servername y header Host del hostname', async () => {
    const captured: Record<string, unknown> = {};
    const res = await outboundFetch(
      NHTSA,
      {},
      { resolve: publicResolver, request: okTransport(captured) }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(captured.host).toBe('93.184.216.34'); // TCP a la IP pinneada
    expect(captured.servername).toBe(OUTBOUND_ALLOWLIST[0]); // SNI/cert del hostname
    const headers = captured.headers as Record<string, string>;
    expect(headers.Host).toBe(OUTBOUND_ALLOWLIST[0]);
  });

  it('F4-6 (a — Scenario 4): un 302 hacia donde sea se rechaza sin seguirlo y se loguea', async () => {
    const transport: OutboundRequestFn = async () => ({
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data' },
      body: Buffer.alloc(0),
    });
    await expect(
      outboundFetch(NHTSA, {}, { resolve: publicResolver, request: transport })
    ).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(renderPrometheusMetrics()).toContain(
      'archon_security_events_total{event="SSRF_BLOCKED"} 1'
    );
  });

  it('F4-7: resolución vacía se rechaza (C indeterminado = ⊥, fail-closed)', async () => {
    await expect(
      outboundFetch(NHTSA, {}, { resolve: async () => [], request: okTransport() })
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('F4-9: error de red del transporte se propaga y alimenta el breaker como fallo', async () => {
    const host = OUTBOUND_ALLOWLIST[0];
    const failingTransport: OutboundRequestFn = async () => {
      throw new Error('ECONNRESET');
    };
    await expect(
      outboundFetch(`https://${host}/x`, {}, { resolve: publicResolver, request: failingTransport })
    ).rejects.toThrow('ECONNRESET');
    // 1/1 fallos = 100% ≥ 50% → el breaker abrió
    expect(getBreaker(host).state()).toBe('OPEN');
  });

  it('F4-10: respuesta 5xx retorna ok=false, alimenta el breaker como fallo y text() expone el cuerpo', async () => {
    const host = OUTBOUND_ALLOWLIST[1];
    const transport: OutboundRequestFn = async () => ({
      status: 503,
      headers: {},
      body: Buffer.from('unavailable'),
    });
    const res = await outboundFetch(
      `https://${host}/token`,
      {},
      { resolve: publicResolver, request: transport }
    );
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(await res.text()).toBe('unavailable');
    expect(getBreaker(host).state()).toBe('OPEN');
  });

  it('F4-11: puerto explícito en la URL llega al transporte', async () => {
    const captured: Record<string, unknown> = {};
    await outboundFetch(
      `https://${OUTBOUND_ALLOWLIST[0]}:8443/x`,
      {},
      { resolve: publicResolver, request: okTransport(captured) }
    );
    expect(captured.port).toBe(8443);
  });

  it('F4-8: init.method/headers/body llegan al transporte', async () => {
    const captured: Record<string, unknown> = {};
    await outboundFetch(
      NHTSA,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' },
      { resolve: publicResolver, request: okTransport(captured) }
    );
    expect(captured.method).toBe('POST');
    expect((captured.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(captured.body).toBe('{"a":1}');
  });
});

describe('T3 — CircuitBreaker (Scenario 5)', () => {
  it('CLOSED con failRate < 50% en ventana de 10s', () => {
    let clock = 0;
    const breaker = new CircuitBreaker(() => clock);
    breaker.record(true);
    breaker.record(true);
    breaker.record(true);
    breaker.record(false); // 25% < 50%
    clock += 1000;
    expect(breaker.state()).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  it('fila ⊥⊥: failRate ≥ 50% → OPEN, sin salida y con fallback inmediato', () => {
    let clock = 0;
    const breaker = new CircuitBreaker(() => clock);
    breaker.record(false);
    breaker.record(true); // 50% ≥ 50%
    expect(breaker.state()).toBe('OPEN');
    clock += 5000; // aún dentro de recovery 30s
    expect(breaker.canRequest()).toBe(false);
  });

  it('fila ⊥⊤ (HALF-OPEN): tras 30s permite UN probe; ⊤→CLOSED', () => {
    let clock = 0;
    const breaker = new CircuitBreaker(() => clock);
    breaker.record(false);
    clock += 30_000;
    expect(breaker.state()).toBe('HALF_OPEN');
    expect(breaker.canRequest()).toBe(true); // probe único
    expect(breaker.canRequest()).toBe(false); // segundo request durante el probe: rechazado
    breaker.record(true);
    expect(breaker.state()).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  it('HALF-OPEN con probe ⊥ → reabre OPEN otros 30s', () => {
    let clock = 0;
    const breaker = new CircuitBreaker(() => clock);
    breaker.record(false);
    clock += 30_000;
    expect(breaker.canRequest()).toBe(true);
    breaker.record(false);
    expect(breaker.state()).toBe('OPEN');
    expect(breaker.canRequest()).toBe(false);
    clock += 30_000;
    expect(breaker.canRequest()).toBe(true); // nuevo probe tras la segunda ventana
  });

  it('la ventana desliza: éxitos con más de 10s de antigüedad no diluyen el failRate actual', () => {
    let clock = 0;
    const breaker = new CircuitBreaker(() => clock);
    breaker.record(true);
    breaker.record(true);
    breaker.record(true);
    clock += 11_000; // los 3 éxitos salen de la ventana
    breaker.record(false); // 1/1 = 100% en la ventana vigente (sin deslizamiento sería 1/4 = 25%)
    expect(breaker.state()).toBe('OPEN');
  });

  it('Scenario 5 e2e: breaker OPEN por host → outboundFetch responde BreakerOpenError sin llamar al exterior', async () => {
    resetOutboundState();
    const host = OUTBOUND_ALLOWLIST[0];
    const breaker = getBreaker(host);
    breaker.record(false); // 100% ≥ 50% → OPEN
    let transportCalled = false;
    const transport: OutboundRequestFn = async () => {
      transportCalled = true;
      return { status: 200, headers: {}, body: Buffer.alloc(0) };
    };
    await expect(
      outboundFetch(`https://${host}/x`, {}, { resolve: publicResolver, request: transport })
    ).rejects.toBeInstanceOf(BreakerOpenError);
    expect(transportCalled).toBe(false);
  });

  it('breaker es por host: NHTSA OPEN no afecta a FCM', async () => {
    resetOutboundState();
    getBreaker(OUTBOUND_ALLOWLIST[0]).record(false);
    const res = await outboundFetch(
      `https://${OUTBOUND_ALLOWLIST[2]}/v1/projects/p/messages:send`,
      { method: 'POST' },
      { resolve: publicResolver, request: okTransport() }
    );
    expect(res.status).toBe(200);
  });
});

describe('outboundFetch — deps por defecto (FC165 F3 Slice3.3 Lote B, sin red real)', () => {
  // Cond.R-165-F3-S3-2 (Bravo): estas 2 condiciones son la rama `?? default*`
  // de `deps.resolve`/`deps.request` cuando el caller no inyecta un doble de
  // prueba — SIEMPRE ejercitada en producción, nunca en el resto de esta
  // suite (que siempre inyecta ambos). Se cubre mockeando las primitivas de
  // Node (`dns.promises.lookup` / `https.request`) que `defaultResolve`/
  // `defaultRequest` invocan internamente — sin tocar la red real.
  beforeEach(() => {
    resetOutboundState();
    resetSecurityMetrics();
  });

  afterEach(() => {
    vi.mocked(https.request).mockReset();
  });

  it('usa defaultResolve cuando deps.resolve se omite (dns.promises.lookup mockeado)', async () => {
    const lookupSpy = vi
      .spyOn(dns.promises, 'lookup')
      .mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    try {
      const res = await outboundFetch(NHTSA, {}, { request: okTransport() });
      expect(res.status).toBe(200);
      expect(lookupSpy).toHaveBeenCalledWith(OUTBOUND_ALLOWLIST[0], {
        all: true,
        verbatim: true,
      });
    } finally {
      lookupSpy.mockRestore();
    }
  });

  it('usa defaultRequest cuando deps.request se omite (https.request mockeado)', async () => {
    vi.mocked(https.request).mockImplementation(
      (...args: unknown[]): ReturnType<typeof https.request> => {
        const callback = args[1] as (res: EventEmitter) => void;
        const reqEmitter = Object.assign(new EventEmitter(), {
          write: vi.fn(),
          end: vi.fn(),
          destroy: vi.fn(),
        });
        queueMicrotask(() => {
          const resEmitter = Object.assign(new EventEmitter(), { statusCode: 200, headers: {} });
          callback(resEmitter);
          resEmitter.emit('data', Buffer.from('{"ok":true}'));
          resEmitter.emit('end');
        });
        return reqEmitter as unknown as ReturnType<typeof https.request>;
      }
    );
    const res = await outboundFetch(NHTSA, {}, { resolve: publicResolver });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('Cuantificador ∀ call-site (Regla 22 · método a — dominio finito por grep)', () => {
  it('ningún fetch( crudo fuera de outboundFetch.ts en código de producción del API', () => {
    const srcRoot = path.resolve(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          return;
        }
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return;
        if (entry.name === 'outboundFetch.ts') return;
        const content = fs.readFileSync(full, 'utf8');
        if (/[^.\w]fetch\(/.test(content)) offenders.push(path.relative(srcRoot, full));
      });
    };
    walk(srcRoot);
    expect(offenders).toEqual([]);
  });
});
