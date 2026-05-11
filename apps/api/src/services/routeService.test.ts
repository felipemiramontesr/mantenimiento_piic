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
    mockConnection.execute.mockResolvedValue([[], []]);
  });

  describe('startRoute', () => {
    it('should successfully start a route and impact the unit state', async () => {
      // 1. Mock Unit Check
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'Disponible', odometer: 1000 }]]);
      // 2. Mock Insert Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Mock Update Unit
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. Mock Activity Log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const uuid = await RouteService.startRoute('UNIT-001', 1, 1000, 100, 'Mina 1');

      expect(uuid).toBeDefined();
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledTimes(4);
    });

    it('should throw error if unit is not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(RouteService.startRoute('MISSING', 1, 1000, 100, 'Dest')).rejects.toThrow(
        /Unit MISSING not found/
      );
    });

    it('should handle transaction start failure', async () => {
      mockConnection.beginTransaction.mockRejectedValueOnce(new Error('TX_FAIL'));

      await expect(RouteService.startRoute('UNIT-1', 1, 1000, 100, 'Dest')).rejects.toThrow(
        'TX_FAIL'
      );
    });

    it('should throw error if unit is already in transit', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'En Ruta', odometer: 1000 }]]);

      await expect(RouteService.startRoute('BUSY', 1, 1000, 100, 'Dest')).rejects.toThrow(
        /Unit BUSY is already in transit/
      );
    });

    it('should throw error if start reading is lower than unit odometer', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'Disponible', odometer: 2000 }]]);

      await expect(RouteService.startRoute('UNIT-1', 1, 1500, 100, 'Dest')).rejects.toThrow(
        /Start reading \(1500 KM\) cannot be lower than the unit's current odometer \(2000 KM\)/
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

      await RouteService.finishRoute('UUID-123', {
        endReading: 1200,
        fuelLevelEnd: 95,
        fuelLiters: 0,
        fuelAmount: 500,
      });

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?, status = "Disponible"'
        ),
        [1200, 95, 'UNIT-001']
      );
    });

    it('should throw error if route is not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(
        RouteService.finishRoute('MISSING', { endReading: 2000, fuelLevelEnd: 100 })
      ).rejects.toThrow(/Route not found/);
    });

    it('should throw error if route is not active', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'COMPLETED' }]]);

      await expect(
        RouteService.finishRoute('DONE', { endReading: 2000, fuelLevelEnd: 100 })
      ).rejects.toThrow(/Route is not active/);
    });

    it('should throw error if end reading is lower than start reading', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE', start_reading: 5000 }]]);

      await expect(
        RouteService.finishRoute('ERROR', { endReading: 4000, fuelLevelEnd: 100 })
      ).rejects.toThrow(/End reading cannot be lower than start reading/);
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

  describe('reportIncident', () => {
    it('should successfully report an incident and log it', async () => {
      const mockRoute = {
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'ACTIVE',
        driver_id: 1,
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]); // Get Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Incident
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Log

      await RouteService.reportIncident('UUID-123', 'MECANICA', 'Test', 'LOW');

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledTimes(3);
    });

    it('should trigger unit status change to En Mantenimiento for CRITICAL severity', async () => {
      const mockRoute = {
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'ACTIVE',
        driver_id: 1,
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]); // Get Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Incident
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update Unit Status

      await RouteService.reportIncident('UUID-123', 'MECANICA', 'Critical Fail', 'CRITICAL');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET status = ? WHERE id = ?'),
        ['En Mantenimiento', 'UNIT-001']
      );
    });

    it('should trigger unit status change to Descontinuada for SINIESTRO category', async () => {
      const mockRoute = {
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'ACTIVE',
        driver_id: 1,
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]); // Get Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Incident
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update Unit Status

      await RouteService.reportIncident('UUID-123', 'SINIESTRO', 'Total Loss', 'HIGH');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET status = ? WHERE id = ?'),
        ['Descontinuada', 'UNIT-001']
      );
    });

    it('should handle incident for non-active route (e.g. COMPLETED)', async () => {
      const mockRoute = {
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'COMPLETED',
        driver_id: 1,
      };

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]); // Get Route
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Incident
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert Log

      await RouteService.reportIncident('UUID-123', 'OTRA', 'Completed Route Issue', 'LOW');

      // status_before should be 'Disponible' because route is COMPLETED
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO unit_activity_logs'),
        expect.arrayContaining(['Disponible', 'Disponible'])
      );
    });

    it('should throw error if route for incident is not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(RouteService.reportIncident('MISSING', 'OTRA', 'Desc', 'LOW')).rejects.toThrow(
        /Route not found/
      );
    });
  });

  describe('Incident Retrieval', () => {
    it('should fetch incidents for a route', async () => {
      const mockIncidents = [{ id: 1, description: 'Test' }];
      (db.execute as any).mockResolvedValueOnce([mockIncidents]);

      const result = await RouteService.getIncidents('UUID-123');
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Test');
    });

    it('should fetch all incidents across fleet', async () => {
      const mockAll = [{ id: 1, unit_id: 'ASM-001' }];
      (db.execute as any).mockResolvedValueOnce([mockAll]);

      const result = await RouteService.getAllIncidents();
      expect(result).toHaveLength(1);
      expect(result[0].unit_id).toBe('ASM-001');
    });
  });

  describe('updateRoute & deleteRoute (Forensic Audit)', () => {
    it('should successfully update an active route with correct column mapping', async () => {
      const mockBefore = { uuid: 'UUID-1', status: 'ACTIVE' };
      const mockAfter = { uuid: 'UUID-1', status: 'ACTIVE', destination: 'New Dest' };

      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]); // Snapshot Before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]); // Snapshot After

      await RouteService.updateRoute(
        'UUID-1',
        { destination: 'New Dest', fuelLevel: 80 },
        'Reason',
        1
      );

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_routes SET destination = ?, fuel_level_start = ? WHERE uuid = ?'
        ),
        ['New Dest', 80, 'UUID-1']
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should update fuel_level_end if route is COMPLETED and propagate to unit', async () => {
      const mockBefore = { uuid: 'UUID-1', status: 'COMPLETED', unit_id: 'ASM-001' };
      const mockAfter = {
        uuid: 'UUID-1',
        status: 'COMPLETED',
        end_time: '2026-05-10T00:00:00Z',
        end_reading: 1500,
        fuel_level_end: 75,
        unit_id: 'ASM-001',
      };

      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]); // Snapshot Before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update Route
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]); // Snapshot After
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]); // syncUnitState SELECT
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update Unit (Chain of Custody)

      await RouteService.updateRoute('UUID-1', { fuelLevel: 75 }, 'Reason', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_routes SET fuel_level_end = ? WHERE uuid = ?'),
        [75, 'UUID-1']
      );

      // Verify Chain of Custody propagation to Unit
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?'),
        [1500, 75, 'ASM-001']
      );
    });

    it('should handle additivesCheck boolean mapping', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);

      await RouteService.updateRoute('UUID-1', { additivesCheck: true }, 'Reason', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_routes SET additives_check = ? WHERE uuid = ?'),
        [1, 'UUID-1']
      );
    });

    it('should handle additivesCheck false mapping', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);

      await RouteService.updateRoute('UUID-1', { additivesCheck: false }, 'Reason', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_routes SET additives_check = ? WHERE uuid = ?'),
        [0, 'UUID-1']
      );
    });

    it('should ignore unmapped fields', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'ACTIVE' }]]);

      await RouteService.updateRoute(
        'UUID-1',
        { unknownField: 'ignore me', destination: 'Dest' } as any,
        'Reason',
        1
      );

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_routes SET destination = ? WHERE uuid = ?'),
        ['Dest', 'UUID-1']
      );
    });

    it('should throw error if uuid is missing', async () => {
      await expect(RouteService.updateRoute('', {}, 'Reason', 1)).rejects.toThrow(
        'Missing route UUID for update'
      );
    });

    it('should handle non-Error exceptions in catch block', async () => {
      mockConnection.execute.mockRejectedValueOnce('STRING_FAIL');
      await expect(
        RouteService.updateRoute('UUID-1', { destination: 'X' }, 'Reason', 1)
      ).rejects.toThrow('Forensic Update Failure: Unknown database error');
    });

    it('should throw error if end reading is lower than start reading during update', async () => {
      const mockBefore = { uuid: 'UUID-1', start_reading: 5000, end_reading: 6000 };
      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]); // Snapshot Before

      await expect(
        RouteService.updateRoute('UUID-1', { endReading: 4000 }, 'Reason', 1)
      ).rejects.toThrow(/End reading \(4000 KM\) cannot be lower than start reading \(5000 KM\)/);
    });

    it('should successfully delete a route and log audit', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ uuid: 'UUID-DEL' }]]); // Snapshot Before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete

      await RouteService.deleteRoute('UUID-DEL', 'Cleanup', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_routes WHERE uuid = ?'),
        ['UUID-DEL']
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });
});
