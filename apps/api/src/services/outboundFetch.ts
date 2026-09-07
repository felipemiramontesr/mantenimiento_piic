/* eslint-disable max-classes-per-file -- 2 errores tipados + breaker: cohesión del guard A10 */
/**
 * 🔱 FC 062 F4 — A10_SSRF_Guard.
 * Wrapper único para TODA salida HTTP del API (∀ call-site — verificado por scan).
 * T1: OutboundAllowed ≡ (host ∈ Allowlist) ∧ (scheme = https) ∧ ¬PrivateIP(resolución final).
 * Requisitos v1.1 (dictamen Alfa 20:54 + Bravo 20:41):
 *   (a) redirects nativos DESACTIVADOS — todo 3xx se rechaza sin seguirse;
 *   (b) resolución host→IP manual ANTES de conectar;
 *   (c) conexión TCP a la IP pinneada con SNI/servername + header Host del hostname;
 *   (d) validación anti-IP-privada/link-local sobre TODAS las IPs resueltas.
 * T3: Circuit Breaker por host — umbral 50% en ventana 10s · recovery 30s (L §11).
 */
import * as dns from 'node:dns';
import * as https from 'node:https';

import { logSecurityEvent } from './securityLog';

export const OUTBOUND_ALLOWLIST = [
  'api.nhtsa.gov',
  'oauth2.googleapis.com',
  'fcm.googleapis.com',
] as const;

export const DEFAULT_TIMEOUT_MS = 8_000;
const BREAKER_WINDOW_MS = 10_000;
const BREAKER_THRESHOLD = 0.5;
const BREAKER_RECOVERY_MS = 30_000;

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Outbound bloqueado (A10 SSRF guard): ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

export class BreakerOpenError extends Error {
  constructor(host: string) {
    super(`Circuit breaker OPEN para ${host} — fallback sin salida (L §11)`);
    this.name = 'BreakerOpenError';
  }
}

/** T1 — composición proposicional pura (Regla 22 · R-TRUTHTABLE). */
export function outboundAllowed(a: boolean, b: boolean, c: boolean): boolean {
  return a && b && c;
}

const PRIVATE_V4_CHECKS: Array<(octets: number[]) => boolean> = [
  (o): boolean => o[0] === 0, // 0.0.0.0/8
  (o): boolean => o[0] === 10, // 10.0.0.0/8
  (o): boolean => o[0] === 127, // loopback
  (o): boolean => o[0] === 169 && o[1] === 254, // link-local (metadata endpoints)
  (o): boolean => o[0] === 172 && o[1] >= 16 && o[1] <= 31, // 172.16.0.0/12
  (o): boolean => o[0] === 192 && o[1] === 168, // 192.168.0.0/16
  (o): boolean => o[0] === 100 && o[1] >= 64 && o[1] <= 127, // CGNAT 100.64.0.0/10
];

function isPrivateV4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  return PRIVATE_V4_CHECKS.some((check) => check(octets));
}

/** Variable C de T1 — evaluada sobre la IP resuelta, jamás sobre el hostname. */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes('.') && !ip.includes(':')) return isPrivateV4(ip);
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]); // v4-mapped hereda la clasificación v4
  if (lower === '::' || lower === '::1') return true; // unspecified / loopback
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
    return true; // link-local fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  return false;
}

interface Outcome {
  at: number;
  ok: boolean;
}

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** T3 — CLOSED / OPEN / HALF-OPEN con probe único (L §11). */
export class CircuitBreaker {
  private outcomes: Outcome[] = [];

  private openedAt: number | null = null;

  private probing = false;

  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  state(): BreakerState {
    if (this.openedAt === null) return 'CLOSED';
    return this.now() - this.openedAt >= BREAKER_RECOVERY_MS ? 'HALF_OPEN' : 'OPEN';
  }

  canRequest(): boolean {
    const state = this.state();
    if (state === 'CLOSED') return true;
    if (state === 'OPEN') return false;
    if (this.probing) return false; // probe único en vuelo
    this.probing = true;
    return true;
  }

  record(ok: boolean): void {
    if (this.openedAt !== null) {
      if (!this.probing) return; // request en vuelo que aterriza con el breaker ya OPEN: no muta estado
      // resultado del probe HALF-OPEN: ⊤→CLOSED · ⊥→OPEN (recovery reinicia)
      this.probing = false;
      if (ok) {
        this.openedAt = null;
        this.outcomes = [];
      } else {
        this.openedAt = this.now();
      }
      return;
    }
    const now = this.now();
    this.outcomes.push({ at: now, ok });
    this.outcomes = this.outcomes.filter((o) => now - o.at < BREAKER_WINDOW_MS);
    const failures = this.outcomes.filter((o) => !o.ok).length;
    if (failures / this.outcomes.length >= BREAKER_THRESHOLD) {
      this.openedAt = now;
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getBreaker(host: string): CircuitBreaker {
  let breaker = breakers.get(host);
  if (!breaker) {
    breaker = new CircuitBreaker();
    breakers.set(host, breaker);
  }
  return breaker;
}

export function resetOutboundState(): void {
  breakers.clear();
}

export interface OutboundRequestOptions {
  host: string; // IP pinneada — (b)/(c)
  servername: string; // SNI/validación de certificado del hostname real
  port: number;
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}

export interface RawOutboundResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

export type OutboundRequestFn = (options: OutboundRequestOptions) => Promise<RawOutboundResponse>;

export interface OutboundResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string | string[] | undefined>;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}

export interface OutboundInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface OutboundDeps {
  resolve?: (hostname: string) => Promise<string[]>;
  request?: OutboundRequestFn;
}

/* v8 ignore start — I/O real: resolución DNS del sistema y socket TLS (deps inyectables en tests) */
const defaultResolve = async (hostname: string): Promise<string[]> => {
  const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
};

const defaultRequest: OutboundRequestFn = (options) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: options.host,
        servername: options.servername,
        port: options.port,
        path: options.path,
        method: options.method,
        headers: options.headers,
        timeout: options.timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Outbound timeout tras ${options.timeoutMs}ms`));
    });
    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
/* v8 ignore stop */

function blockAndLog(url: URL, reason: string): SsrfBlockedError {
  logSecurityEvent({
    event: 'SSRF_BLOCKED',
    route: `${url.protocol}//${url.hostname}${url.pathname}`,
    method: 'OUTBOUND',
    detail: { reason },
  });
  return new SsrfBlockedError(reason);
}

/** T1 + (b)/(d): valida allowlist/scheme y resuelve+valida IPs (FC165 F3 Slice3.3
 * Lote B — extraído de `outboundFetch` para respetar el cap de 50 líneas, Gate2). */
async function resolveAndValidateTarget(
  url: string,
  deps: OutboundDeps
): Promise<{ parsed: URL; addresses: string[] }> {
  const parsed = new URL(url);
  const allowlisted = (OUTBOUND_ALLOWLIST as readonly string[]).includes(parsed.hostname);
  const isHttps = parsed.protocol === 'https:';
  if (!allowlisted || !isHttps) {
    throw blockAndLog(
      parsed,
      !allowlisted ? `host ${parsed.hostname} fuera de allowlist` : 'scheme distinto de https'
    );
  }

  // (b) + (d) — resolución previa y validación de TODAS las IPs
  // Rama default (`defaultResolve`) cubierta mockeando `dns.promises.lookup`
  // (FC165 F3 Slice3.3 Lote B) -- el `/* v8 ignore */` previo no suprimía
  // esta condición ante SonarCloud, solo el reporte local de vitest.
  const resolve = deps.resolve ?? defaultResolve;
  const addresses = await resolve(parsed.hostname);
  const resolutionClean = addresses.length > 0 && addresses.every((ip) => !isPrivateIp(ip));
  if (!outboundAllowed(allowlisted, isHttps, resolutionClean)) {
    throw blockAndLog(
      parsed,
      addresses.length === 0
        ? `resolución DNS vacía para ${parsed.hostname}`
        : `resolución de ${parsed.hostname} contiene IP privada/link-local`
    );
  }
  return { parsed, addresses };
}

/** (a) + (c): ejecuta la petición pinneada y aplica la política de redirects/breaker
 * (FC165 F3 Slice3.3 Lote B — extraído de `outboundFetch` para respetar Gate2). */
async function performOutboundRequest(
  parsed: URL,
  addresses: string[],
  init: OutboundInit,
  requestFn: OutboundRequestFn,
  breaker: CircuitBreaker
): Promise<RawOutboundResponse> {
  let raw: RawOutboundResponse;
  try {
    raw = await requestFn({
      host: addresses[0],
      servername: parsed.hostname,
      port: parsed.port === '' ? 443 : Number(parsed.port),
      path: `${parsed.pathname}${parsed.search}`,
      method: init.method ?? 'GET',
      headers: { ...(init.headers ?? {}), Host: parsed.hostname }, // (c)
      body: init.body,
      timeoutMs: init.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
  } catch (error) {
    breaker.record(false);
    throw error;
  }

  // (a) — sin redirects nativos: el 3xx llegó de un tercero sano (breaker ⊤) pero se rechaza
  if (raw.status >= 300 && raw.status < 400) {
    breaker.record(true);
    throw blockAndLog(parsed, `redirect ${raw.status} rechazado — re-validar como salida nueva`);
  }

  breaker.record(raw.status < 500);
  return raw;
}

/** Wrapper único para salida HTTP outbound del API — T1 SSRF guard + T3 circuit breaker (L §11). */
export async function outboundFetch(
  url: string,
  init: OutboundInit = {},
  deps: OutboundDeps = {}
): Promise<OutboundResponse> {
  const { parsed, addresses } = await resolveAndValidateTarget(url, deps);

  const breaker = getBreaker(parsed.hostname);
  if (!breaker.canRequest()) {
    throw new BreakerOpenError(parsed.hostname);
  }

  // Rama default (`defaultRequest`) cubierta mockeando `https.request` (FC165
  // F3 Slice3.3 Lote B) -- mismo criterio que `resolve` arriba.
  const requestFn = deps.request ?? defaultRequest;
  const raw = await performOutboundRequest(parsed, addresses, init, requestFn, breaker);

  return {
    status: raw.status,
    ok: raw.status >= 200 && raw.status < 300,
    headers: raw.headers,
    text: async () => raw.body.toString('utf8'),
    json: async () => JSON.parse(raw.body.toString('utf8')) as unknown,
  };
}
