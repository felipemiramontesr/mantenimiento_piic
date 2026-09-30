import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import * as SecurityEventsRepository from '../services/securityEvents.repository';
import { refreshDenylistCache } from '../services/securityDenylist.service';
import { hashSecurityIp } from '../services/securityEvents.service';

/**
 * FC201 F3 — consola de eventos de Ω y bloqueo perimetral manual, sobre la app completa. T1.3:
 *   BLOCK_403 ≡ DENIED ∧ ¬AUTH_HEADER ∧ ¬AUTH_ROUTE ∧ ANON_SURFACE
 */

vi.mock('../services/securityEvents.repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/securityEvents.repository')>()),
  listRecentSecurityEvents: vi.fn(),
  listActiveDenylist: vi.fn(),
  upsertDenylistEntry: vi.fn(),
  revokeDenylistEntry: vi.fn(),
  upsertSecurityEvent: vi.fn(),
}));

const BLOCKED_IP = '203.0.113.66';

let app: FastifyInstance;
let omegaToken: string;
let userToken: string;
let mfaToken: string;

const inject = (
  opts: InjectOptions,
  ip = BLOCKED_IP,
  token?: string
): Promise<LightMyRequestResponse> =>
  app.inject({
    ...opts,
    remoteAddress: ip,
    headers: { ...(opts.headers ?? {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });

async function givenBlocked(ips: string[]): Promise<void> {
  (SecurityEventsRepository.listActiveDenylist as Mock).mockResolvedValue(
    ips.map((ip) => ({
      ip_hash: hashSecurityIp(ip),
      ip_address: ip,
      reason: 'escaneo',
      expires_utc: '2026-10-01T20:00:00Z',
      ttl_seconds: 3600,
    }))
  );
  await refreshDenylistCache();
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();
  const { jwt } = app as unknown as { jwt: { sign: (p: object) => string } };
  omegaToken = jwt.sign({ id: 1, roleId: 0, permissions: ['*'], tenant_id: null });
  userToken = jwt.sign({ id: 20, roleId: 3, permissions: ['fleet:view'], tenant_id: 5 });
  mfaToken = jwt.sign({ id: 20, scope: 'mfa' });
});

beforeEach(async () => {
  vi.clearAllMocks();
  await givenBlocked([]);
});

describe('T1.3 — bloqueo perimetral manual', () => {
  beforeEach(async () => {
    await givenBlocked([BLOCKED_IP]);
  });

  it('fila 1 · IP bloqueada sin sesión en superficie anónima → 403 genérico', async () => {
    const responses = await Promise.all(
      ['/health', '/wp-admin/x.php', '/v1/no-existe', '/v1/fleet-units/1/tco'].map((url) =>
        inject({ method: 'GET', url })
      )
    );
    responses.forEach((res) => {
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: 'Forbidden' });
    });
  });

  it('fila 2 · login, refresh, MFA y reto PoW NUNCA se bloquean (P5, P7)', async () => {
    const exempt: InjectOptions[] = [
      { method: 'POST', url: '/v1/auth/login', payload: {} },
      { method: 'POST', url: '/v1/auth/refresh' },
      { method: 'POST', url: '/v1/auth/mfa/verify', payload: {} },
      { method: 'GET', url: '/v1/public/bot-challenge' },
    ];
    const responses = await Promise.all(exempt.map((opts) => inject(opts)));
    responses.forEach((res) => expect(res.statusCode).not.toBe(403));
  });

  it('fila 3 · con sesión válida pasa (Ω o cualquier usuario: inmunidad CGNAT, Inv-3)', async () => {
    expect(
      (await inject({ method: 'GET', url: '/health' }, BLOCKED_IP, omegaToken)).statusCode
    ).toBe(200);
    expect(
      (await inject({ method: 'GET', url: '/health' }, BLOCKED_IP, userToken)).statusCode
    ).toBe(200);
  });

  it('un token de alcance MFA o uno corrupto NO son sesión: la IP bloqueada no pasa', async () => {
    // El de alcance MFA lo corta antes `tokenTypeGuard` (401); el corrupto llega al bloqueo (403).
    expect((await inject({ method: 'GET', url: '/health' }, BLOCKED_IP, mfaToken)).statusCode).toBe(
      401
    );
    expect((await inject({ method: 'GET', url: '/health' }, BLOCKED_IP, 'a.b.c')).statusCode).toBe(
      403
    );
  });

  it('fila 4 · una IP no bloqueada pasa normal', async () => {
    expect((await inject({ method: 'GET', url: '/health' }, '198.51.100.1')).statusCode).toBe(200);
  });
});

describe('GET /v1/cosmology/security-events', () => {
  it('solo Ω: sin sesión 401, con sesión no-Ω 403', async () => {
    expect(
      (await inject({ method: 'GET', url: '/v1/cosmology/security-events' }, '10.0.0.1')).statusCode
    ).toBe(401);
    expect(
      (await inject({ method: 'GET', url: '/v1/cosmology/security-events' }, '10.0.0.1', userToken))
        .statusCode
    ).toBe(403);
  });

  it('entrega eventos (IP en claro o null) y bloqueos vigentes en camelCase', async () => {
    (SecurityEventsRepository.listRecentSecurityEvents as Mock).mockResolvedValueOnce([
      {
        event_type: 'BAIT_ROUTE',
        ip_hash: 'h'.repeat(64),
        ip_address: null,
        target_pattern: '/wp-admin/*',
        hits: '12',
        first_seen_utc: '2026-09-30T20:00:00Z',
        last_seen_utc: '2026-09-30T20:30:00Z',
      },
    ]);
    await givenBlocked(['198.51.100.9']);

    const res = await inject(
      { method: 'GET', url: '/v1/cosmology/security-events' },
      '10.0.0.1',
      omegaToken
    );

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({
      events: [
        {
          eventType: 'BAIT_ROUTE',
          ipHash: 'h'.repeat(64),
          ipAddress: null,
          targetPattern: '/wp-admin/*',
          hits: 12,
          firstSeenUtc: '2026-09-30T20:00:00Z',
          lastSeenUtc: '2026-09-30T20:30:00Z',
        },
      ],
      blocks: [
        {
          ipHash: hashSecurityIp('198.51.100.9'),
          ipAddress: '198.51.100.9',
          reason: 'escaneo',
          expiresUtc: '2026-10-01T20:00:00Z',
        },
      ],
    });
  });
});

describe('POST/DELETE /v1/cosmology/security-events/deny-ip', () => {
  const deny = (payload: object, token = omegaToken): Promise<LightMyRequestResponse> =>
    inject(
      { method: 'POST', url: '/v1/cosmology/security-events/deny-ip', payload },
      '10.0.0.1',
      token
    );

  it('Ω bloquea una IP válida (1 h a 30 días) y el guard la ve de inmediato', async () => {
    (SecurityEventsRepository.listActiveDenylist as Mock).mockResolvedValue([
      { ip_hash: hashSecurityIp('192.0.2.44'), ttl_seconds: 3600 },
    ]);

    const res = await deny({ ip: ' 192.0.2.44 ', hours: 24, reason: '  escaneo  ' });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.ipHash).toBe(hashSecurityIp('192.0.2.44'));
    expect(SecurityEventsRepository.upsertDenylistEntry).toHaveBeenCalledWith({
      ipHash: hashSecurityIp('192.0.2.44'),
      ipAddress: '192.0.2.44',
      reason: 'escaneo',
      hours: 24,
      createdBy: 1,
    });
    expect((await inject({ method: 'GET', url: '/health' }, '192.0.2.44')).statusCode).toBe(403);
  });

  it('sin motivo guarda null; IPv6 también es válida', async () => {
    expect((await deny({ ip: '2001:db8::1', hours: 1 })).statusCode).toBe(201);
    expect(
      (SecurityEventsRepository.upsertDenylistEntry as Mock).mock.calls[0][0].reason
    ).toBeNull();
  });

  it('rechaza IP inválida, horas fuera de 1..720 y a quien no es Ω', async () => {
    expect((await deny({ ip: '999.1.1.1', hours: 1 })).statusCode).toBe(400);
    expect((await deny({ ip: '192.0.2.1', hours: 0 })).statusCode).toBe(400);
    expect((await deny({ ip: '192.0.2.1', hours: 721 })).statusCode).toBe(400);
    expect((await deny({ ip: '192.0.2.1', hours: 1 }, userToken)).statusCode).toBe(403);
    expect(SecurityEventsRepository.upsertDenylistEntry).not.toHaveBeenCalled();
  });

  it('revocar: 200 si había bloqueo, 404 si no, 400 si el hash no es válido', async () => {
    (SecurityEventsRepository.revokeDenylistEntry as Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const revoke = (hash: string): Promise<LightMyRequestResponse> =>
      inject(
        { method: 'DELETE', url: `/v1/cosmology/security-events/deny-ip/${hash}` },
        '10.0.0.1',
        omegaToken
      );

    expect((await revoke('a'.repeat(64))).statusCode).toBe(200);
    expect((await revoke('a'.repeat(64))).statusCode).toBe(404);
    expect((await revoke('no-es-hash')).statusCode).toBe(400);
  });
});
