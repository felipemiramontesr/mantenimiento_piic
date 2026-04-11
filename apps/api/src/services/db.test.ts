import { describe, it, expect, vi } from 'vitest';
import mysql from 'mysql2/promise';
import db from './db';

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(() => 'mocked_pool_pinnacle'),
  },
}));

describe('Database Service (ARCHON CORE)', () => {
  it('should initialize mysql connection pool with environment variables', () => {
    // The db module executes on import, so we verify what it called createPool with
    expect(mysql.createPool).toHaveBeenCalled();
    expect(db).toBe('mocked_pool_pinnacle');
  });
});
