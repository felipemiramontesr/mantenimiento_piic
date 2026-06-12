import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import mysql from 'mysql2/promise';
import { resolveDbHost, MEXICO_TZ_OFFSET } from './db';

const poolOnMock = vi.hoisted(() => vi.fn());

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(() => ({ on: poolOnMock })),
  },
}));

describe('Database Service (ARCHON CORE)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should initialize mysql connection pool with environment variables', () => {
    expect(mysql.createPool).toHaveBeenCalled();
  });

  it('should utilize localhost as a fallback if DB_HOST is missing', () => {
    delete process.env.DB_HOST;
    expect(resolveDbHost()).toBe('localhost');
  });

  it('should utilize process.env.DB_HOST if provided', () => {
    process.env.DB_HOST = 'db.piic.mx';
    expect(resolveDbHost()).toBe('db.piic.mx');
  });

  // ─── Timezone Anchor (V.174) — CURDATE()/NOW() en hora de México ────────────

  it('registers a connection hook on the pool', () => {
    expect(poolOnMock).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  it('anchors every new connection to Mexico timezone (-06:00, sin DST desde 2022)', () => {
    expect(MEXICO_TZ_OFFSET).toBe('-06:00');

    const connectionCall = (poolOnMock as Mock).mock.calls.find((call) => call[0] === 'connection');
    expect(connectionCall).toBeDefined();

    const handler = connectionCall![1] as (conn: { query: Mock }) => void;
    const fakeConnection = { query: vi.fn() };
    handler(fakeConnection);

    expect(fakeConnection.query).toHaveBeenCalledWith("SET time_zone = '-06:00'");
  });
});
