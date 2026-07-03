/* eslint-disable */
// @ts-nocheck
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
      // 1. Unit availability check
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'Disponible', odometer: 1000 }]]);
      // 2. INSERT fleet_movements (CTI base) — needs insertId
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);
      // 3. INSERT fleet_route_extensions (CTI child)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. UPDATE fleet_units status → En Ruta
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 5. INSERT unit_activity_logs
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const uuid = await RouteService.startRoute('UNIT-001', 1, 1000, 100, 'Mina 1');

      expect(uuid).toBeDefined();
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledTimes(5);
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

    it('resolves destination from neighborhood catalog with prefix (destinationNeighborhoodId)', async () => {
      const coloniaRow = { neighborhood: 'Col Norte', municipality: 'Hermosillo', state: 'Sonora' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ status: 'Disponible', odometer: 1000 }]]) // unit check
        .mockResolvedValueOnce([[coloniaRow]]) // neighborhood query
        .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]) // INSERT fleet_movements
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT fleet_route_extensions
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE fleet_units
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT unit_activity_logs

      const uuid = await RouteService.startRoute(
        'UNIT-001',
        1,
        1000,
        100,
        'Mina Sur',
        undefined,
        undefined,
        42
      );

      expect(uuid).toBeDefined();
      const insertRouteCall = mockConnection.execute.mock.calls[2];
      expect(insertRouteCall[0]).toContain('INSERT INTO fleet_movements');
    });

    it('resolves destination to pure suffix when destination not provided with neighborhoodId', async () => {
      const coloniaRow = { neighborhood: 'Col Sur', municipality: 'Nogales', state: 'Sonora' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ status: 'Disponible', odometer: 500 }]])
        .mockResolvedValueOnce([[coloniaRow]])
        .mockResolvedValueOnce([{ insertId: 2, affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const uuid = await RouteService.startRoute(
        'UNIT-002',
        2,
        500,
        80,
        '',
        undefined,
        undefined,
        55
      );

      expect(uuid).toBeDefined();
    });

    it('resolves to pure suffix when destination starts with neighborhood (empty prefix branch)', async () => {
      const coloniaRow = { neighborhood: 'Col Norte', municipality: 'Hermosillo', state: 'Sonora' };
      mockConnection.execute
        .mockResolvedValueOnce([[{ status: 'Disponible', odometer: 800 }]])
        .mockResolvedValueOnce([[coloniaRow]])
        .mockResolvedValueOnce([{ insertId: 3, affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      // destination starts with neighborhood → split gives empty parts[0] → prefix='' → falsy ternary branch
      const uuid = await RouteService.startRoute(
        'UNIT-003',
        3,
        800,
        70,
        'Col Norte y algo mas',
        undefined,
        undefined,
        66
      );

      expect(uuid).toBeDefined();
    });

    it('should throw error if unit is already in transit', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'En Ruta', odometer: 1000 }]]);

      await expect(RouteService.startRoute('BUSY', 1, 1000, 100, 'Dest')).rejects.toThrow(
        /Unit BUSY is already in transit/
      );
    });

    it('should throw error if unit is under maintenance (Downtime)', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ status: 'Downtime', odometer: 1000 }]]);

      await expect(RouteService.startRoute('DOWN', 1, 1000, 100, 'Dest')).rejects.toThrow(
        /Unit DOWN is under maintenance/
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
        id: 10,
        unit_id: 'UNIT-001',
        start_reading: 1000,
        status: 'ACTIVE',
        driver_id: 1,
      };

      // 1. SELECT fm JOIN fre FOR UPDATE
      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]);
      // 2. UPDATE fleet_movements (telemetry)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. UPDATE fleet_route_extensions (logistics fields)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. UPDATE fleet_units
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 5. INSERT unit_activity_logs
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

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]); // SELECT fm JOIN fre
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT incident
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT log

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

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

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

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

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

      mockConnection.execute.mockResolvedValueOnce([[mockRoute]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await RouteService.reportIncident('UUID-123', 'OTRA', 'Completed Route Issue', 'LOW');

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

    it('RT-SVC-ALL-2: getAllIncidents([1,2]) → SQL con filtro IN (?, ?) (B465 TRUE)', async () => {
      const mockAll = [{ id: 2, unit_id: 'ASM-002' }];
      (db.execute as any).mockResolvedValueOnce([mockAll]);

      const result = await RouteService.getAllIncidents([1, 2]);
      expect(result).toHaveLength(1);
      const [query, params] = (db.execute as any).mock.calls[0];
      expect(query).toContain('IN (?, ?)');
      expect(params).toEqual([1, 2]);
    });
  });

  describe('addCheckpoint', () => {
    it('RT-SVC-ADD-1: routeUuid no encontrado → lanza "Route not found" (B393 TRUE)', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // routes empty

      await expect(
        RouteService.addCheckpoint('UUID-NONE', { sequence: 1, name: 'Stop A' })
      ).rejects.toThrow('Route not found');
    });

    it('RT-SVC-ADD-2: ruta válida → inserta checkpoint y retorna insertId (camino feliz)', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([[{ id: 5, status: 'ACTIVE' }]]) // routes found
        .mockResolvedValueOnce([{ insertId: 99, affectedRows: 1 }]); // INSERT

      const id = await RouteService.addCheckpoint('UUID-ACTIVE', {
        sequence: 1,
        name: 'Stop A',
        neighborhoodId: 10,
        eta: '08:00',
      });
      expect(id).toBe(99);
    });
  });

  describe('getCheckpoints', () => {
    it('RT-SVC-GET-1: routeUuid no encontrado → lanza "Route not found" (B413 TRUE)', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // routes empty

      await expect(RouteService.getCheckpoints('UUID-NONE')).rejects.toThrow('Route not found');
    });

    it('RT-SVC-GET-2: ruta válida → retorna checkpoints ordenados (camino feliz)', async () => {
      const mockCheckpoints = [{ id: 1, sequence: 1, name: 'Stop A' }];
      (db.execute as any)
        .mockResolvedValueOnce([[{ id: 5 }]]) // routes found
        .mockResolvedValueOnce([mockCheckpoints]); // SELECT checkpoints

      const result = await RouteService.getCheckpoints('UUID-ACTIVE');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Stop A');
    });
  });

  describe('arriveAtCheckpoint', () => {
    it('RT-SVC-ARR-1: routeUuid no encontrado → lanza "Route not found" (B435 TRUE)', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // routes empty

      await expect(RouteService.arriveAtCheckpoint('UUID-NONE', 1)).rejects.toThrow(
        'Route not found'
      );
    });

    it('RT-SVC-ARR-2: checkpoint no encontrado (affectedRows=0) → lanza "Checkpoint not found" (B444 TRUE)', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([[{ id: 5 }]]) // routes found
        .mockResolvedValueOnce([{ affectedRows: 0 }]); // UPDATE → no match

      await expect(RouteService.arriveAtCheckpoint('UUID-ACTIVE', 999)).rejects.toThrow(
        'Checkpoint not found or already visited'
      );
    });

    it('RT-SVC-ARR-3: checkpoint válido → UPDATE exitoso y resuelve sin valor (camino feliz)', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([[{ id: 5 }]]) // routes found
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE → 1 row affected

      await expect(RouteService.arriveAtCheckpoint('UUID-ACTIVE', 1)).resolves.toBeUndefined();
    });
  });

  describe('updateRoute & deleteRoute (Forensic Audit)', () => {
    it('should successfully update an active route with correct column mapping', async () => {
      // CTI: mockBefore must include id (movement_id for extension UPDATE)
      const mockBefore = { uuid: 'UUID-1', status: 'ACTIVE', id: 42, unit_id: 'ASM-001' };
      const mockAfter = {
        uuid: 'UUID-1',
        status: 'ACTIVE',
        destination: 'New Dest',
        id: 42,
        unit_id: 'ASM-001',
      };

      // 1. SELECT snapshot before (fm JOIN fre FOR UPDATE)
      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]);
      // 2. UPDATE fleet_movements (fuelLevel → fuel_level_start when ACTIVE)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. UPDATE fleet_route_extensions (destination)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. SELECT snapshot after
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]);
      // 5. syncUnitState SELECT → empty → no further update

      await RouteService.updateRoute(
        'UUID-1',
        { destination: 'New Dest', fuelLevel: 80 },
        'Reason',
        1
      );

      // fuelLevel → fleet_movements
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_movements SET fuel_level_start = ? WHERE uuid = ?'),
        [80, 'UUID-1']
      );
      // destination → fleet_route_extensions (movement_id = snapshotBefore.id)
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_route_extensions SET destination = ? WHERE movement_id = ?'
        ),
        ['New Dest', 42]
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should update fuel_level_end if route is COMPLETED and propagate to unit', async () => {
      const mockBefore = { uuid: 'UUID-1', status: 'COMPLETED', unit_id: 'ASM-001', id: 42 };
      const mockAfter = {
        uuid: 'UUID-1',
        status: 'COMPLETED',
        end_reading: 1500,
        fuel_level_end: 75,
        unit_id: 'ASM-001',
        id: 42,
      };

      // 1. Snapshot before
      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]);
      // 2. UPDATE fleet_movements (fuelLevel → fuel_level_end when COMPLETED)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Snapshot after
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]);
      // 4. syncUnitState SELECT → returns mockAfter so unit gets updated
      mockConnection.execute.mockResolvedValueOnce([[mockAfter]]);
      // 5. UPDATE fleet_units (Chain of Custody)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await RouteService.updateRoute('UUID-1', { fuelLevel: 75 }, 'Reason', 1);

      // fuelLevel maps to fleet_movements (fuel_level_end when COMPLETED)
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_movements SET fuel_level_end = ? WHERE uuid = ?'),
        [75, 'UUID-1']
      );
      // Chain of Custody propagation to unit
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?'),
        [1500, 75, 'ASM-001']
      );
    });

    it('should handle additivesCheck boolean mapping', async () => {
      const mockSnapshot = { status: 'ACTIVE', id: 42, unit_id: 'ASM-001' };

      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]); // Snapshot before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE fleet_route_extensions
      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]); // Snapshot after
      // syncUnitState uses default [[], []] → no unit update

      await RouteService.updateRoute('UUID-1', { additivesCheck: true }, 'Reason', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_route_extensions SET additives_check = ? WHERE movement_id = ?'
        ),
        [1, 42]
      );
    });

    it('should handle additivesCheck false mapping', async () => {
      const mockSnapshot = { status: 'ACTIVE', id: 42, unit_id: 'ASM-001' };

      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]);

      await RouteService.updateRoute('UUID-1', { additivesCheck: false }, 'Reason', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_route_extensions SET additives_check = ? WHERE movement_id = ?'
        ),
        [0, 42]
      );
    });

    it('should ignore unmapped fields', async () => {
      const mockSnapshot = { status: 'ACTIVE', id: 42, unit_id: 'ASM-001' };

      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]); // Snapshot before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE fleet_route_extensions
      mockConnection.execute.mockResolvedValueOnce([[mockSnapshot]]); // Snapshot after
      // syncUnitState → default empty

      await RouteService.updateRoute(
        'UUID-1',
        { unknownField: 'ignore me', destination: 'Dest' } as any,
        'Reason',
        1
      );

      // unknownField ignored; destination → fleet_route_extensions
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE fleet_route_extensions SET destination = ? WHERE movement_id = ?'
        ),
        ['Dest', 42]
      );
    });

    it('should throw error if uuid is missing', async () => {
      await expect(RouteService.updateRoute('', {}, 'Reason', 1)).rejects.toThrow(
        'Missing route UUID for update'
      );
    });

    it('resolves destination with prefix when destinationNeighborhoodId provided and destination differs from suffix', async () => {
      const mockBefore = {
        uuid: 'UUID-N',
        id: 10,
        status: 'ACTIVE',
        start_reading: 100,
        end_reading: null,
        unit_id: 'ASM-001',
      };
      const mockAfter = { ...mockBefore, destination: 'Mina Sur, Col Norte, Hermosillo, Sonora' };
      const coloniaRow = { neighborhood: 'Col Norte', municipality: 'Hermosillo', state: 'Sonora' };

      mockConnection.execute
        .mockResolvedValueOnce([[mockBefore]]) // SELECT snapshot before
        .mockResolvedValueOnce([[coloniaRow]]) // SELECT neighborhood
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE fleet_route_extensions
        .mockResolvedValueOnce([[mockAfter]]) // SELECT snapshot after
        .mockResolvedValueOnce([[]]); // syncUnitState → no completed route

      await RouteService.updateRoute(
        'UUID-N',
        { destinationNeighborhoodId: 99, destination: 'Mina Sur' },
        'Test',
        1
      );

      const updateCall = mockConnection.execute.mock.calls[2];
      expect(updateCall[1]).toEqual(
        expect.arrayContaining(['Mina Sur, Col Norte, Hermosillo, Sonora'])
      );
    });

    it('resolves destination to pure suffix when no input destination provided', async () => {
      const mockBefore = {
        uuid: 'UUID-N2',
        id: 11,
        status: 'ACTIVE',
        start_reading: 200,
        end_reading: null,
        unit_id: 'ASM-002',
      };
      const coloniaRow = { neighborhood: 'Col Sur', municipality: 'Hermosillo', state: 'Sonora' };
      const mockAfter = { ...mockBefore };

      mockConnection.execute
        .mockResolvedValueOnce([[mockBefore]])
        .mockResolvedValueOnce([[coloniaRow]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[mockAfter]])
        .mockResolvedValueOnce([[]]);

      await RouteService.updateRoute('UUID-N2', { destinationNeighborhoodId: 100 }, 'Test', 1);

      const updateCall = mockConnection.execute.mock.calls[2];
      expect(updateCall[1]).toEqual(expect.arrayContaining(['Col Sur, Hermosillo, Sonora']));
    });

    it('resolves to pure suffix when existing destination starts with neighborhood (empty prefix branch)', async () => {
      const mockBefore = {
        uuid: 'UUID-N3',
        id: 12,
        status: 'ACTIVE',
        start_reading: 300,
        end_reading: null,
        unit_id: 'ASM-003',
      };
      const coloniaRow = { neighborhood: 'Col Norte', municipality: 'Hermosillo', state: 'Sonora' };
      const mockAfter = { ...mockBefore };

      mockConnection.execute
        .mockResolvedValueOnce([[mockBefore]])
        .mockResolvedValueOnce([[coloniaRow]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[mockAfter]])
        .mockResolvedValueOnce([[]]);

      // destination starts with neighborhood → parts[0]='' → prefix='' → falsy ternary branch → pure suffix
      await RouteService.updateRoute(
        'UUID-N3',
        { destinationNeighborhoodId: 101, destination: 'Col Norte y algo mas' },
        'Test',
        1
      );

      const updateCall = mockConnection.execute.mock.calls[2];
      expect(updateCall[1]).toEqual(expect.arrayContaining(['Col Norte, Hermosillo, Sonora']));
    });

    it('should handle non-Error exceptions in catch block', async () => {
      mockConnection.execute.mockRejectedValueOnce('STRING_FAIL');
      await expect(
        RouteService.updateRoute('UUID-1', { destination: 'X' }, 'Reason', 1)
      ).rejects.toThrow('Forensic Update Failure: Unknown database error');
    });

    it('should throw error if end reading is lower than start reading during update', async () => {
      const mockBefore = {
        uuid: 'UUID-1',
        start_reading: 5000,
        end_reading: 6000,
        id: 42,
        unit_id: 'ASM-001',
      };
      mockConnection.execute.mockResolvedValueOnce([[mockBefore]]);

      await expect(
        RouteService.updateRoute('UUID-1', { endReading: 4000 }, 'Reason', 1)
      ).rejects.toThrow(/End reading \(4000 KM\) cannot be lower than start reading \(5000 KM\)/);
    });

    it('should successfully delete a route and log audit', async () => {
      // CTI: SELECT fm JOIN fre FOR UPDATE, then DELETE fleet_movements (CASCADE removes extension)
      mockConnection.execute.mockResolvedValueOnce([
        [{ uuid: 'UUID-DEL', unit_id: 'ASM-001', id: 1 }],
      ]); // Snapshot before
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE fleet_movements
      // syncUnitState SELECT → default [[], []] → unit_id present but no COMPLETED route → no UPDATE

      await RouteService.deleteRoute('UUID-DEL', 'Cleanup', 1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_movements WHERE uuid = ?'),
        ['UUID-DEL']
      );
      expect(mockConnection.commit).toHaveBeenCalled();
    });
  });
});
