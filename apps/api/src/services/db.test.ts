import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mysql from 'mysql2/promise';
import { resolveDbHost } from './db';

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(() => 'mocked_pool_pinnacle'),
  },
}));

describe('Database Service (ARCHON CORE)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
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
});
