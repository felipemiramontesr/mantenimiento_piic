import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import { getEntityAuditHistory, recordAuditLog } from '../services/auditService';
import runMigration073 from '../services/runMigration073';

/**
 * 🔱 Archon Forensic Integrity & Coverage Certification Suite
 * Goal: 100.00% Coverage across all forensic modules.
 */

// 🛡️ Mock DB Connection Engine
const mockConnection = {
  execute: vi.fn().mockResolvedValue([[], undefined]),
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

describe('🔱 Archon Forensic Integrity Certification', () => {
  const app = buildApp();
  let mockToken: string;

  beforeAll(async () => {
    await app.ready();
    mockToken = app.jwt.sign({ id: 1, email: 'admin@piic.mx' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection.execute.mockReset();
    mockConnection.query.mockReset();
    mockConnection.execute.mockResolvedValue([[], undefined]);
    mockConnection.query.mockResolvedValue([[], undefined]);
  });

  const authHeader = (): Record<string, string> => ({
    Authorization: `Bearer ${mockToken}`,
  });

  describe('🛡️ Audit Service Certification', () => {
    it('should retrieve entity audit history', async () => {
      const mockHistory = [{ id: 1, action: 'UPDATE', reason: 'Test' }];
      (db.query as Mock).mockResolvedValueOnce([mockHistory, undefined]);

      const history = await getEntityAuditHistory('user', '1');
      expect(history).toEqual(mockHistory);
    });

    it('should record audit log without snapshot_before (branch coverage)', async () => {
      await recordAuditLog({
        entity_type: 'catalog',
        entity_id: '1',
        action: 'CREATE',
        reason: 'New Seed',
        user_id: 1,
      });
      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('🛡️ Route Forensic Certification', () => {
    it('should update route forensically', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1, uuid: 'r1' }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update
        .mockResolvedValueOnce([[{ id: 1, uuid: 'r1' }], undefined]); // Snapshot After

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { data: { destination: 'New' }, reason: 'Correction' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    it('should return 400 when route not found on update', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { data: { destination: 'New' }, reason: 'Correction' },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Route not found');
    });

    it('should delete route forensically', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1, uuid: 'r1' }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // Delete

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { reason: 'Decommissioning' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 when route not found on delete', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { reason: 'Decommissioning' },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Route not found');
    });

    it('should handle errors in route forensic updates', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('CRITICAL_FAIL'));
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { data: { destination: 'New' }, reason: 'Correction' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('should handle errors in route forensic deletes', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('CRITICAL_FAIL'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/routes/r1',
        headers: authHeader(),
        payload: { reason: 'Decommissioning' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('🛡️ Identity Forensic Certification', () => {
    it('should return 400 on invalid payload for user patch (auth.ts)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { data: { email: 'invalid' }, reason: 'Bad Data' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when user not found on patch (auth.ts)', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/999',
        headers: authHeader(),
        payload: { data: { fullName: 'X' }, reason: 'Search Fail' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should cover all update fields in user patch (branch coverage)', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update
        .mockResolvedValueOnce([[{ id: 1 }], undefined]); // After

      const payload = {
        fullName: 'N',
        department: 'D',
        email: 'e@e.com',
        password: 'password123',
        roleId: 2,
        profilePictureUrl: 'p.jpg',
        employeeNumber: 'E1',
        departmentId: 5,
        is_active: true,
      };

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { data: payload, reason: 'Full Sync' },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 500 when update fails (catch block)', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('FATAL_UPDATE'));
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { data: { fullName: 'Fail' }, reason: 'Fatal Update Fail' },
      });
      expect(response.statusCode).toBe(500);
    });

    it('should delete user forensically (auth.ts)', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // Delete

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { reason: 'Termination' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 when reason is missing on delete (auth.ts)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { reason: 'sh' }, // Too short
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when user not found on delete', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/users/999',
        headers: authHeader(),
        payload: { reason: 'Not Found' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return 500 when delete fails (catch block)', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('FATAL_DELETE'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/users/1',
        headers: authHeader(),
        payload: { reason: 'Fatal Fail' },
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('🛡️ Fleet Service Edge Cases', () => {
    it('should handle empty update payload in FleetService', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 'UNIT-1' }], undefined]);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/UNIT-1',
        headers: authHeader(),
        payload: { data: { unknownField: 123 }, reason: 'No Valid Changes' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when reason is missing on delete', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/UNIT-1',
        headers: authHeader(),
        payload: { reason: 'sh' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('🛡️ Infrastructure: Migration Certification', () => {
    it('should execute migration 073 correctly', async () => {
      const mockResult = [{ affectedRows: 1 }, undefined];
      (db.execute as Mock).mockResolvedValue(mockResult);
      await runMigration073();
      expect(db.execute).toHaveBeenCalled();
    });

    it('should handle missing migration file (branch coverage)', async () => {
      // Use a path that definitely does not exist
      await runMigration073('/non/existent/path.sql');
      // No exception means it handled it correctly (skipped)
    });

    it('should handle migration failure (catch block)', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('MIGRATION_FAIL'));
      await expect(runMigration073()).rejects.toThrow('MIGRATION_FAIL');
    });
  });
});
