import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as SecurityEventsRepository from './securityEvents.repository';
import { hashSecurityIp } from './securityEvents.service';
import {
  denyIp,
  isIpDenied,
  refreshDenylistCache,
  revokeIpDenial,
} from './securityDenylist.service';

/** FC201 F3 — lista de bloqueo manual de Ω en memoria (P4, Inv-3). */

vi.mock('./securityEvents.repository', () => ({
  listActiveDenylist: vi.fn(),
  upsertDenylistEntry: vi.fn(),
  revokeDenylistEntry: vi.fn(),
}));

const NOW = 1_800_000_000_000;

function givenActive(entries: { ip: string; ttlSeconds: number }[]): void {
  (SecurityEventsRepository.listActiveDenylist as Mock).mockResolvedValue(
    entries.map((e) => ({ ip_hash: hashSecurityIp(e.ip), ttl_seconds: String(e.ttlSeconds) }))
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  givenActive([]);
  await refreshDenylistCache(NOW);
});

describe('isIpDenied — solo memoria, sin DB por petición', () => {
  it('lista vacía: nadie está bloqueado y no se consulta la DB', () => {
    vi.clearAllMocks();

    expect(isIpDenied('203.0.113.9', NOW)).toBe(false);
    expect(SecurityEventsRepository.listActiveDenylist).not.toHaveBeenCalled();
  });

  it('bloquea la IP de la lista hasta su vencimiento y a nadie más', async () => {
    givenActive([{ ip: '203.0.113.9', ttlSeconds: 60 }]);
    expect(await refreshDenylistCache(NOW)).toBe(1);

    expect(isIpDenied('203.0.113.9', NOW + 59_000)).toBe(true);
    expect(isIpDenied('203.0.113.9', NOW + 61_000)).toBe(false);
    expect(isIpDenied('198.51.100.1', NOW)).toBe(false);
  });
});

describe('altas y revocaciones de Ω', () => {
  it('denyIp guarda el HMAC y la IP con su vencimiento y recarga la lista al instante', async () => {
    givenActive([{ ip: '203.0.113.9', ttlSeconds: 3600 }]);

    const ipHash = await denyIp({ ip: '203.0.113.9', hours: 1, reason: 'scan', createdBy: 7 });

    expect(ipHash).toBe(hashSecurityIp('203.0.113.9'));
    expect(SecurityEventsRepository.upsertDenylistEntry).toHaveBeenCalledWith({
      ipHash,
      ipAddress: '203.0.113.9',
      reason: 'scan',
      hours: 1,
      createdBy: 7,
    });
    expect(isIpDenied('203.0.113.9')).toBe(true);
  });

  it('revokeIpDenial libera la IP al instante e informa si había bloqueo', async () => {
    givenActive([{ ip: '203.0.113.9', ttlSeconds: 3600 }]);
    await refreshDenylistCache();
    (SecurityEventsRepository.revokeDenylistEntry as Mock).mockResolvedValueOnce(true);
    givenActive([]);

    expect(await revokeIpDenial(hashSecurityIp('203.0.113.9'))).toBe(true);
    expect(isIpDenied('203.0.113.9')).toBe(false);
  });
});
