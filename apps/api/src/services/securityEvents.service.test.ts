import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as SecurityEventsRepository from './securityEvents.repository';
import {
  hashSecurityIp,
  recordSecurityEvent,
  reportSecurityEvent,
  runSecurityEventsLifecycle,
  type SecurityEventInput,
} from './securityEvents.service';

/** FC201 — registro de eventos (F2: HMAC + IP en claro acotada, coalescencia) y ciclo de vida (F1). */

vi.mock('./securityEvents.repository', () => ({
  upsertSecurityEvent: vi.fn(),
  clearExpiredClearIps: vi.fn(),
  deleteOldSecurityEvents: vi.fn(),
  deleteStaleDenylistEntries: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSecurityEventsLifecycle', () => {
  it('corre las tres limpiezas y reporta cuántas filas tocó cada una', async () => {
    (SecurityEventsRepository.clearExpiredClearIps as Mock).mockResolvedValue(4);
    (SecurityEventsRepository.deleteOldSecurityEvents as Mock).mockResolvedValue(5);
    (SecurityEventsRepository.deleteStaleDenylistEntries as Mock).mockResolvedValue(1);

    expect(await runSecurityEventsLifecycle()).toEqual({
      clearedIps: 4,
      purgedEvents: 5,
      purgedDenylist: 1,
    });
  });
});

describe('hashSecurityIp', () => {
  it('HMAC-SHA256 en hex (64), estable y sin la IP en claro', () => {
    const hash = hashSecurityIp('203.0.113.9');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecurityIp('203.0.113.9')).toBe(hash);
    expect(hash).not.toContain('203');
    expect(hashSecurityIp('203.0.113.10')).not.toBe(hash);
  });

  it('la clave sale de JWT_SECRET; sin ella (solo dev/test) usa el respaldo y cambia el hash', () => {
    vi.stubEnv('JWT_SECRET', 'clave-a');
    const withSecret = hashSecurityIp('203.0.113.9');
    vi.stubEnv('JWT_SECRET', undefined);
    const withFallback = hashSecurityIp('203.0.113.9');
    vi.unstubAllEnvs();

    expect(withFallback).toMatch(/^[0-9a-f]{64}$/);
    expect(withFallback).not.toBe(withSecret);
  });
});

describe('recordSecurityEvent', () => {
  it('guarda el HMAC y la IP en claro, con la carnada del catálogo, la muestra aparte y 1 toque', async () => {
    await recordSecurityEvent({
      type: 'BAIT_ROUTE',
      ip: '203.0.113.9',
      targetPattern: '/wp-admin/*',
      sample: '/wp-admin/install.php',
    });

    expect(SecurityEventsRepository.upsertSecurityEvent).toHaveBeenCalledWith({
      eventType: 'BAIT_ROUTE',
      ipHash: hashSecurityIp('203.0.113.9'),
      ipAddress: '203.0.113.9',
      targetPattern: '/wp-admin/*',
      samplePath: '/wp-admin/install.php',
      hits: 1,
    });
  });

  it('trunca la muestra a 255 y la IP a 45; sin muestra guarda null', async () => {
    await recordSecurityEvent(
      { type: 'TRAP_ACCOUNT', ip: 'x'.repeat(60), targetPattern: 'admin', sample: 'y'.repeat(400) },
      3
    );
    await recordSecurityEvent({ type: 'TRAP_FIELD', ip: '198.51.100.1', targetPattern: 'login' });

    const [[first], [second]] = (SecurityEventsRepository.upsertSecurityEvent as Mock).mock.calls;
    expect(first.ipAddress).toHaveLength(45);
    expect(first.samplePath).toHaveLength(255);
    expect(first.hits).toBe(3);
    expect(second.samplePath).toBeNull();
  });
});

describe('reportSecurityEvent — segundo plano y coalescencia', () => {
  const bait = (n: number): SecurityEventInput => ({
    type: 'BAIT_ROUTE',
    ip: '203.0.113.9',
    targetPattern: '/wp-admin/*',
    sample: `/wp-admin/${n}.php`,
  });
  const flush = (): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  type UpsertRow = { hits: number; samplePath: string | null };
  const upserts = (): UpsertRow[] =>
    (SecurityEventsRepository.upsertSecurityEvent as Mock).mock.calls.map(
      ([row]) => row as UpsertRow
    );
  const totalHits = (): number => upserts().reduce((sum, row) => sum + row.hits, 0);

  // Cada prueba drena sus escrituras: la coalescencia vive en el módulo y no debe cruzar pruebas.
  afterEach(async () => {
    await flush();
    await flush();
  });

  it('no escribe en la misma vuelta: la respuesta sale antes que la DB', async () => {
    reportSecurityEvent(bait(1), vi.fn());

    expect(SecurityEventsRepository.upsertSecurityEvent).not.toHaveBeenCalled();
    await flush();
    expect(SecurityEventsRepository.upsertSecurityEvent).toHaveBeenCalledTimes(1);
  });

  it('B1 · Inv-2: una ráfaga de la misma llave se escribe coalescida, con el conteo exacto', async () => {
    let release: () => void = () => undefined;
    (SecurityEventsRepository.upsertSecurityEvent as Mock)
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      )
      .mockResolvedValue(undefined);

    reportSecurityEvent(bait(0), vi.fn());
    await flush();
    for (let n = 1; n < 10_000; n += 1) reportSecurityEvent(bait(n), vi.fn());
    release();
    await flush();
    await flush();

    const [first, second] = upserts();
    expect(upserts()).toHaveLength(2);
    expect(first.hits).toBe(1);
    expect(totalHits()).toBe(10_000);
    expect(second.samplePath).toBe('/wp-admin/9999.php');
  });

  it('llaves distintas no se mezclan y un fallo de la DB solo llega a onError', async () => {
    const failure = new Error('db down');
    (SecurityEventsRepository.upsertSecurityEvent as Mock).mockRejectedValueOnce(failure);
    const onError = vi.fn();

    reportSecurityEvent(bait(1), onError);
    reportSecurityEvent({ ...bait(2), targetPattern: '/phpmyadmin/*' }, vi.fn());
    await flush();
    await flush();

    expect(SecurityEventsRepository.upsertSecurityEvent).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
