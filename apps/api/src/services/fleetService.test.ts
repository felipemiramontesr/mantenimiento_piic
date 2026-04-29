/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FleetService from './fleetService';
import db from './db';

// 🔱 Mock Database Interface
vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('FleetService - Unit Certification (Sovereign Grade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUnits', () => {
    it('should retrieve and process all units from registry', async () => {
      const mockRows = [
        { id: 'ASM-001', assetTypeId: 1, lastServiceReading: 5000, currentReading: 6000 },
      ];
      (db.execute as any).mockResolvedValue([mockRows]);

      const logger = { info: vi.fn(), error: vi.fn() };
      const results = await FleetService.getAllUnits(logger as any);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ASM-001');
      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe('createUnit', () => {
    const mockData = {
      id: 'VEH-999',
      assetTypeId: 1,
      brandId: 10,
      modelId: 20,
      numeroSerie: 'SN-123456',
    };

    it('should create a unit successfully with encryption', async () => {
      // Mock unique checks (ID and Serial)
      (db.execute as any)
        .mockResolvedValueOnce([[]]) // ID check
        .mockResolvedValueOnce([[]]) // Serial check
        .mockResolvedValueOnce([{ insertId: 1 }]); // Insert

      const result = await FleetService.createUnit(mockData);

      expect(result.id).toBe('VEH-999');
      expect(db.execute).toHaveBeenCalledTimes(3);
    });

    it('should throw conflict error if ID already exists', async () => {
      (db.execute as any).mockResolvedValueOnce([[{ id: 'VEH-999' }]]);

      await expect(FleetService.createUnit(mockData)).rejects.toThrow(
        /CONFLICT: El identificador 'VEH-999' ya existe/
      );
    });

    it('should throw conflict error if serial number (Blind Index) exists', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([[]]) // ID is free
        .mockResolvedValueOnce([[{ id: 'OTHER' }]]); // Serial is taken

      await expect(FleetService.createUnit(mockData)).rejects.toThrow(
        /CONFLICT: El número de serie ya existe/
      );
    });
  });

  describe('updateUnit (Boundary Control)', () => {
    it('should return false for empty update payload (Coverage: Line 137)', async () => {
      const result = await FleetService.updateUnit('ASM-001', {});
      expect(result).toBe(false);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('should execute update if payload is valid', async () => {
      (db.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await FleetService.updateUnit('ASM-001', { lastServiceReading: 7000 });

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([7000, 'ASM-001'])
      );
    });
  });

  describe('deleteUnit', () => {
    it('should remove unit from registry', async () => {
      (db.execute as any).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await FleetService.deleteUnit('ASM-001');

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_units WHERE id = ?'),
        ['ASM-001']
      );
    });
  });
});
