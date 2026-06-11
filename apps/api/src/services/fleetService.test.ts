/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FleetService from './fleetService';
import db from './db';

// 🔱 Mock Database Interface
const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[]]),
  query: vi.fn().mockResolvedValue([[]]),
};

vi.mock('./db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[]]),
    query: vi.fn().mockResolvedValue([[]]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

describe('FleetService - Unit Certification (Sovereign Grade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUnits', () => {
    it('should retrieve and process all units from registry', async () => {
      const mockRows = [
        { id: 'ASM-001', assetTypeId: 1, lastServiceReading: 5000, odometer: 6000 },
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
      const result = await FleetService.updateUnit('ASM-001', {}, 'Reason', 1);
      expect(result).toBe(false);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('should execute update if payload is valid', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]); // Snapshot After

      const result = await FleetService.updateUnit(
        'ASM-001',
        { lastServiceReading: 7000 },
        'Reason',
        1
      );

      expect(result).toBe(true);
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([7000, 'ASM-001'])
      );
    });

    it('Omega Protocol: maintIntervalDays=180 maps to maintenanceTimeFreqId=1044', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalDays: 180 }, 'Reason', 1);

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([1044, 'ASM-001'])
      );
    });

    it('Omega Protocol: maintIntervalDays=365 maps to maintenanceTimeFreqId=1045', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalDays: 365 }, 'Reason', 1);

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([1045, 'ASM-001'])
      );
    });

    it('Omega Protocol: unrecognized maintIntervalDays maps maintenanceTimeFreqId to null', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalDays: 30 }, 'Reason', 1);

      const updateCall = (mockConn.execute as any).mock.calls[1];
      expect(updateCall[1]).toContain(null);
    });

    it('Omega Protocol: maintIntervalKm=10000 maps to maintenanceUsageFreqId=1047', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalKm: 10000 }, 'Reason', 1);

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([1047, 'ASM-001'])
      );
    });

    it('Omega Protocol: unrecognized maintIntervalKm maps maintenanceUsageFreqId to null', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalKm: 7500 }, 'Reason', 1);

      const updateCall = (mockConn.execute as any).mock.calls[1];
      expect(updateCall[1]).toContain(null);
    });

    it('Omega Protocol: maintIntervalDays=90 maps to maintenanceTimeFreqId=1048 (line 320)', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalDays: 90 }, 'Reason', 1);

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([1048, 'ASM-001'])
      );
    });

    it('Omega Protocol: maintIntervalKm=5000 maps to maintenanceUsageFreqId=1046 (line 333)', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalKm: 5000 }, 'Reason', 1);

      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET'),
        expect.arrayContaining([1046, 'ASM-001'])
      );
    });

    it('Omega Protocol: maintIntervalDays=null uses 0 fallback → maintenanceTimeFreqId=null (line 320 null branch)', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalDays: null } as any, 'Reason', 1);

      const updateCall = (mockConn.execute as any).mock.calls[1];
      expect(updateCall[1]).toContain(null); // maintenanceTimeFreqId = null (days=0 → else branch)
    });

    it('Omega Protocol: maintIntervalKm=null uses 0 fallback → maintenanceUsageFreqId=null (line 333 null branch)', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]);

      await FleetService.updateUnit('ASM-001', { maintIntervalKm: null } as any, 'Reason', 1);

      const updateCall = (mockConn.execute as any).mock.calls[1];
      expect(updateCall[1]).toContain(null); // maintenanceUsageFreqId = null (km=0 → else branch)
    });
  });

  describe('getAllUnits — kpi merge (line 79)', () => {
    it('merges KPI data when computeKpis returns an entry for the unit', async () => {
      const mockRows = [
        { id: 'ASM-001', assetTypeId: 1, lastServiceReading: 5000, odometer: 6000 },
      ];
      (db.execute as any)
        .mockResolvedValueOnce([mockRows])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-001', mttr_hours: 24 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-001', mtbf_hours: 200 }]])
        .mockResolvedValueOnce([[]]);

      const logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      };
      const results = await FleetService.getAllUnits(logger as any);

      expect(results[0]).toHaveProperty('mttrHours', 24);
    });
  });

  describe('getUnitById (line 116)', () => {
    it('returns null when unit is not found', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // no rows
      const logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      };
      const result = await FleetService.getUnitById('GHOST-001', logger as any);
      expect(result).toBeNull();
    });

    it('returns unit merged with KPI when kpiMap has entry (truthy kpi branch)', async () => {
      const unitRow = [{ id: 'ASM-002', assetTypeId: 1, lastServiceReading: 3000, odometer: 4000 }];
      (db.execute as any)
        .mockResolvedValueOnce([unitRow])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-002', mttr_hours: 48 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-002', mtbf_hours: 300 }]])
        .mockResolvedValueOnce([[]]);
      const logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      };
      const result = await FleetService.getUnitById('ASM-002', logger as any);
      expect(result).not.toBeNull();
      expect((result as any).mttrHours).toBe(48);
    });
  });

  describe('deleteUnit', () => {
    it('should remove unit from registry', async () => {
      const mockConn = await db.getConnection();
      (mockConn.execute as any)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }]]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete

      const result = await FleetService.deleteUnit('ASM-001', 'Reason', 1);

      expect(result).toBe(true);
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_units WHERE id = ?'),
        ['ASM-001']
      );
    });
  });
});
