import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Archon Integration Test: Geolocation Routes
 * Feature Contract: Archon_Master_Fase6_OwnerProfile_MultiCampoAddress — Fase 6-B
 * Scenario 5: Any authenticated user can call /geolocation/* (fleet:view NOT required)
 * Scenario 6: Unauthenticated requests are rejected with 401
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

describe('Geolocation Routes — FC6 Scenarios 5+6', () => {
  const app = buildApp();
  let tokenNoFleetView: string;

  beforeAll(async () => {
    await app.ready();
    // Token with no fleet:view permission — simulates Rol 3 (Centro) or Rol 4 (Privado)
    tokenNoFleetView = app.jwt.sign({
      id: 99,
      username: 'centro.user',
      roleId: 3,
      roleName: 'Centro',
      permissions: ['profile:read'], // explicitly NO fleet:view
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Scenario 6 — Sin JWT → 401 ──────────────────────────────────────────

  it('rejects unauthenticated request to /geolocation/states with 401 — Scenario 6', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/geolocation/states' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  // ── Scenario 5 — Autenticado sin fleet:view → 200 ───────────────────────

  it('returns states list for authenticated user without fleet:view — Scenario 5', async () => {
    const mockStates = [
      { id: 14, name: 'Jalisco' },
      { id: 9, name: 'Ciudad de México' },
    ];
    (db.execute as Mock).mockResolvedValueOnce([mockStates]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/geolocation/states',
      headers: { authorization: `Bearer ${tokenNoFleetView}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockStates);
  });

  it('returns municipalities for a state — authenticated without fleet:view', async () => {
    const mockMunicipalities = [{ id: 120, name: 'Guadalajara' }];
    (db.execute as Mock).mockResolvedValueOnce([mockMunicipalities]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/geolocation/states/14/municipalities',
      headers: { authorization: `Bearer ${tokenNoFleetView}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual(mockMunicipalities);
  });

  it('returns neighborhoods for a municipality — authenticated without fleet:view', async () => {
    const mockNeighborhoods = [
      { id: 456, name: 'Centro', postalCode: '44100', city: 'Guadalajara' },
    ];
    (db.execute as Mock).mockResolvedValueOnce([mockNeighborhoods]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/geolocation/municipalities/120/neighborhoods',
      headers: { authorization: `Bearer ${tokenNoFleetView}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual(mockNeighborhoods);
  });

  it('returns neighborhood details by id for hydration — authenticated without fleet:view', async () => {
    const mockNeighborhood = {
      id: 456,
      name: 'Centro',
      postalCode: '44100',
      municipalityId: 120,
      stateId: 14,
    };
    (db.execute as Mock).mockResolvedValueOnce([[mockNeighborhood]]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/geolocation/neighborhoods/456',
      headers: { authorization: `Bearer ${tokenNoFleetView}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual(mockNeighborhood);
  });
});
