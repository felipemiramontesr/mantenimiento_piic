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

  it('declares charset utf8mb4 in pool config — Invariant §9.7', () => {
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({ charset: 'utf8mb4' }));
  });

  // Incidente DB-1045 P1 (Alfa/Bravo) — keep-alive para reducir reconexiones
  // bajo el burst concurrente del SPA. connectionLimit se deja intacto (10):
  // Bravo lo marcó como experimento a medir, no un cambio a aplicar a ciegas.
  it('enables TCP keep-alive on the pool — incidente DB-1045 P1', () => {
    expect(mysql.createPool).toHaveBeenCalledWith(
      expect.objectContaining({ enableKeepAlive: true, keepAliveInitialDelay: expect.any(Number) })
    );
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

  // Incidente P0 V.78.103.262 — el evento `connection` entrega la conexión CALLBACK de mysql2: su
  // `query()` devuelve un `Query` que lanza si alguien le invoca `.then`. El doble reproduce eso, así
  // que tratar el resultado como promesa (lo que tumbó producción) hace fallar estas pruebas.
  type QueryCallback = (err: { message: string } | null) => void;
  interface CoreConnectionDouble {
    query: Mock;
    destroy: Mock;
  }

  function coreConnectionDouble(failingSql?: string): CoreConnectionDouble {
    const mysqlQuery = {
      then(): never {
        throw new Error(
          'You have tried to call .then() on the result of query that is not a promise'
        );
      },
    };
    return {
      query: vi.fn((sql: string, cb?: QueryCallback) => {
        cb?.(sql === failingSql ? { message: 'ER_UNKNOWN_TIME_ZONE' } : null);
        return mysqlQuery;
      }),
      destroy: vi.fn(),
    };
  }

  function runConnectionHook(conn: CoreConnectionDouble): void {
    const connectionCall = (poolOnMock as Mock).mock.calls.find((call) => call[0] === 'connection');
    expect(connectionCall).toBeDefined();
    (connectionCall![1] as (c: CoreConnectionDouble) => void)(conn);
  }

  it('anchors every new connection to Mexico timezone (-06:00, sin DST desde 2022)', () => {
    expect(MEXICO_TZ_OFFSET).toBe('-06:00');
    const conn = coreConnectionDouble();
    runConnectionHook(conn);

    expect(conn.query).toHaveBeenCalledWith("SET time_zone = '-06:00'", expect.any(Function));
    expect(conn.destroy).not.toHaveBeenCalled();
  });

  it('sets utf8mb4 charset on every new connection — Invariant §9.7', () => {
    const conn = coreConnectionDouble();
    runConnectionHook(conn);

    expect(conn.query).toHaveBeenCalledWith('SET NAMES utf8mb4', expect.any(Function));
    expect(conn.destroy).not.toHaveBeenCalled();
  });

  it('destroys the connection once and logs when session init fails — FC202 F2', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const conn = coreConnectionDouble("SET time_zone = '-06:00'");
    runConnectionHook(conn);

    expect(conn.destroy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('db-session-init-failed'));
    errorSpy.mockRestore();
  });
});
