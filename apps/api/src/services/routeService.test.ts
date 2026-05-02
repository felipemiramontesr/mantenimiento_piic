/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteService from './routeService';
import db from './db';

// 🔱 Mock Database and Connection
const mockConnection = {
  execute: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

vi.mock('./db', () => ({
  default: {
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
    execute: vi.fn(),
  },
}));

describe('RouteService - Journey Engine (Forensic Standard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startRoute', () => {
    it('should successfully start a route and impact the unit state', async () => {
      // 1. Mock Unit Check
      mockConnection.execute.mockResolvedValueOnce([
        [{ status: 'Disponible', currentReading: 1000 }],
      ]);
      // 2. Mock Insert Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Mock Update Unit
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. Mock Activity Log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const uuid = await RouteService.startRoute('UNIT-001', 1, 1000, 'Mina 1');

      expect(uuid).toBeDefined();
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledTimes(4);
    });

    it('should throw error if unit is not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(RouteService.startRoute('MISSING', 1, 1000, 'Dest')).rejects.toThrow(
        /Unit MISSING not found/
      );
    });

    it('should handle transaction start failure', async () => {
      mockConnection.beginTransaction.mockRejectedValueOnce(new Error('TX_FAIL'));

      await expect(RouteService.startRoute('UNIT-1', 1, 1000, 'Dest')).rejects.toThrow('TX_FAIL');
    });

    it('should throw error if unit is already in transit', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'En Ruta', currentReading: 1000 }]]);

      await expect(RouteService.startRoute('BUSY', 1, 1000, 'Dest')).rejects.toThrow(
        /Unit BUSY is already in transit/
      );
    });
  });

  describe('finishRoute', () => {
    it('should complete journey and update unit telemetry', async () => {
      const mockRoute = {
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'ACTIVE',
        driver_id: 1,
      };

      // 1. Mock Route Context
      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]);
      // 2. Mock Update Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Mock Update Unit
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. Mock Final Log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await RouteService.finishRoute('UUID-123', 1200);

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET currentReading = ?, status = "Disponible"'),
        [1200, 'UNIT-001']
      );
    });

    it('should throw error if route is not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(RouteService.finishRoute('MISSING', 2000)).rejects.toThrow(/Route not found/);
    });

    it('should throw error if route is not active', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'COMPLETED' }]]);

      await expect(RouteService.finishRoute('DONE', 2000)).rejects.toThrow(/Route is not active/);
    });

    it('should throw error if end reading is lower than start reading', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE', start_reading: 5000 }]]);

      await expect(RouteService.finishRoute('ERROR', 4000)).rejects.toThrow(
        /End reading cannot be lower than start reading/
      );
    });
  });

  describe('getActiveRoute', () => {
    it('should return active route if exists', async () => {
      const mockRows = [{ uuid: 'ACT-123', status: 'ACTIVE' }];
      (db.execute as any).mockResolvedValueOnce([mockRows]);

      const result = await RouteService.getActiveRoute('UNIT-001');
      expect(result?.uuid).toBe('ACT-123');
    });

    it('should return null if no active route exists', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]);

      const result = await RouteService.getActiveRoute('UNIT-999');
      expect(result).toBeNull();
    });
  });
});
