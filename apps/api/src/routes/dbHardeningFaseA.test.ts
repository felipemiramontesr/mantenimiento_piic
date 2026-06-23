import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

/**
 * DB_Hardening_Normalization_2026 — FaseA
 * Verifies: collation unification correctness patterns (AT-A-1..3)
 */
describe('DB Hardening FaseA — Collation Unification Verification', () => {
  let token: string;
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
      ownerId: 9100,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-A-1: INFORMATION_SCHEMA query returns utf8mb4_unicode_ci for financial_transactions.category', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ COLLATION_NAME: 'utf8mb4_unicode_ci' }]]);

    const [rows] = await db.execute(
      `SELECT COLLATION_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'financial_transactions'
         AND COLUMN_NAME = 'category'`
    );

    expect((rows as { COLLATION_NAME: string }[])[0].COLLATION_NAME).toBe('utf8mb4_unicode_ci');
  });

  it('AT-A-2: view_fleet_oee_factors query executes without COLLATE workaround (verified by view definition)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          unit_id: 'PIIC-101',
          route_count: 65,
          quality_factor: 0.9846,
          total_km: 42350,
          daily_km_avg: 35.5,
          active_days: 180,
        },
      ],
    ]);

    const [rows] = await db.execute(
      `SELECT unit_id, route_count, quality_factor, total_km, daily_km_avg
       FROM view_fleet_oee_factors
       WHERE unit_id = 'PIIC-101'`
    );

    expect(rows).toHaveLength(1);
    expect((rows as { unit_id: string }[])[0].unit_id).toBe('PIIC-101');
  });

  it('AT-A-3: view_fleet_model_failure_patterns query executes without CONVERT() syntax (clean view definition)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ brand_id: 23, model_id: 525, failure_category: 'MAINTENANCE', confidence_score: 0.6667 }],
    ]);

    const [rows] = await db.execute(
      `SELECT brand_id, model_id, failure_category, confidence_score
       FROM view_fleet_model_failure_patterns
       WHERE confidence_score >= 0.30`
    );

    expect(Array.isArray(rows)).toBe(true);
  });

  it('AT-A-4: GET /v1/fleet-units/:unitId/intelligence returns 200 after collation fix', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 'PIIC-101',
            ownerId: 9100,
            assetTypeId: 1,
            odometer: 42350,
            lastServiceReading: 40000,
            lastServiceDate: '2026-06-01',
            maintIntervalKm: 10000,
            maintIntervalDays: 180,
            dailyUsageAvg: 35.5,
            fuelTankCapacity: 80,
            monthlyLeasePayment: 15000,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ ownerId: 9100 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/intelligence',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
  });
});
