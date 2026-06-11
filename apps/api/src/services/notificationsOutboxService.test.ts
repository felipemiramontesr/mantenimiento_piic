import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from './db';
import NotificationService from './notification.service';
import {
  processPendingAlerts,
  purgeOutboxForOrder,
  purgeOutboxByType,
} from './notificationsOutboxService';

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));

vi.mock('./notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT', SYSTEM: 'SYSTEM' },
  ArchonNotificationPriority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
}));

describe('NotificationsOutboxService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([[], undefined]);
  });

  describe('processPendingAlerts — maintenance workflow', () => {
    it('dispatches MEDIUM to maint:write for OPEN order not in outbox', async () => {
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[{ uuid: 'ORD-001' }]]) // OPEN orders query
        .mockResolvedValueOnce([[]]) // outbox check: not sent
        .mockResolvedValueOnce([[], undefined]) // INSERT IGNORE
        .mockResolvedValueOnce([[]]); // ACTIVE orders query

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'maint:write', priority: 'MEDIUM' })
      );
    });

    it('skips OPEN order already recorded in outbox', async () => {
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[{ uuid: 'ORD-001' }]]) // OPEN orders query
        .mockResolvedValueOnce([[{ id: 1 }]]) // outbox check: already sent
        .mockResolvedValueOnce([[]]); // ACTIVE orders query

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).not.toHaveBeenCalled();
    });

    it('dispatches HIGH to fleet:write for ACTIVE order not in outbox', async () => {
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[]]) // OPEN orders query (none)
        .mockResolvedValueOnce([[{ uuid: 'ORD-002' }]]) // ACTIVE orders query
        .mockResolvedValueOnce([[]]) // outbox check: not sent
        .mockResolvedValueOnce([[], undefined]); // INSERT IGNORE

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'fleet:write', priority: 'HIGH' })
      );
    });

    it('skips ACTIVE order already recorded in outbox', async () => {
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[]]) // OPEN orders (none)
        .mockResolvedValueOnce([[{ uuid: 'ORD-002' }]]) // ACTIVE orders
        .mockResolvedValueOnce([[{ id: 5 }]]); // outbox check: already sent

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).not.toHaveBeenCalled();
    });

    it('is resilient — resolves even when dispatch rejects', async () => {
      vi.mocked(NotificationService.dispatch).mockRejectedValue(new Error('FCM down'));

      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[{ uuid: 'ORD-001' }]]) // OPEN orders
        .mockResolvedValueOnce([[]]) // outbox check: not sent
        .mockResolvedValueOnce([[], undefined]) // INSERT IGNORE
        .mockResolvedValueOnce([[]]); // ACTIVE orders

      await expect(processPendingAlerts()).resolves.not.toThrow();
    });

    it('dispatches nothing when all queues are empty', async () => {
      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).not.toHaveBeenCalled();
    });

    it('records outbox entry before dispatching', async () => {
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[{ uuid: 'ORD-003' }]]) // OPEN orders
        .mockResolvedValueOnce([[]]) // outbox check: not sent
        .mockResolvedValueOnce([[], undefined]) // INSERT IGNORE
        .mockResolvedValueOnce([[]]); // ACTIVE orders

      await processPendingAlerts();

      const insertCall = (db.execute as ReturnType<typeof vi.fn>).mock.calls[2];
      expect((insertCall[0] as string).toUpperCase()).toContain('INSERT IGNORE');
      expect(insertCall[1]).toContain('ORD-003');
    });
  });

  describe('processPendingAlerts — fleet compliance', () => {
    it('dispatches MEDIUM to fleet:write for insurance expiry within 15D', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql.includes('insuranceExpiryDate') && sql.includes('BETWEEN 0 AND 15')) {
          return Promise.resolve([
            [{ uuid: 'unit-uuid-001', unitId: 'ASM-001', daysLeft: 10 }],
            undefined,
          ]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'fleet:write', priority: 'MEDIUM', type: 'SYSTEM' })
      );
    });

    it('dispatches HIGH to fleet:write for insurance expiry within 3D', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql.includes('insuranceExpiryDate') && sql.trim().endsWith('BETWEEN 0 AND 3')) {
          return Promise.resolve([
            [{ uuid: 'unit-uuid-002', unitId: 'ASM-002', daysLeft: 2 }],
            undefined,
          ]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'fleet:write', priority: 'HIGH', type: 'SYSTEM' })
      );
    });

    it('skips fleet unit alert already recorded in outbox', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql.includes('insuranceExpiryDate') && sql.includes('BETWEEN 0 AND 30')) {
          return Promise.resolve([
            [{ uuid: 'unit-uuid-001', unitId: 'ASM-001', daysLeft: 25 }],
            undefined,
          ]);
        }
        if (sql.includes('SELECT id FROM notifications_outbox')) {
          return Promise.resolve([[{ id: 9 }], undefined]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).not.toHaveBeenCalled();
    });

    it('dispatches MEDIUM to maint:write for scheduled order overdue', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (
          sql.includes('fleet_maintenance_extensions') &&
          sql.includes('service_date < CURDATE')
        ) {
          return Promise.resolve([[{ uuid: 'ORD-OVER-001' }], undefined]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'maint:write', priority: 'MEDIUM' })
      );
    });

    it('dispatches MEDIUM to fleet:write for verificacion expiry within 15D', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql.includes('vencimientoVerificacion') && sql.includes('BETWEEN 0 AND 15')) {
          return Promise.resolve([
            [{ uuid: 'unit-uuid-ver', unitId: 'ASM-V01', daysLeft: 5 }],
            undefined,
          ]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'fleet:write', priority: 'MEDIUM', type: 'SYSTEM' })
      );
    });

    it('dispatches MEDIUM to fleet:write for legal compliance expiry within 15D', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (sql.includes('legalComplianceDate') && sql.includes('BETWEEN 0 AND 15')) {
          return Promise.resolve([
            [{ uuid: 'unit-uuid-legal', unitId: 'ASM-L01', daysLeft: 8 }],
            undefined,
          ]);
        }
        return Promise.resolve([[], undefined]);
      });

      await processPendingAlerts();

      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledOnce();
      expect(vi.mocked(NotificationService.dispatch)).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'fleet:write', priority: 'MEDIUM', type: 'SYSTEM' })
      );
    });
  });

  describe('purgeOutboxForOrder', () => {
    it('deletes all outbox entries for the given order UUID', async () => {
      await purgeOutboxForOrder('ORD-DONE');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications_outbox'),
        ['ORD-DONE']
      );
    });
  });

  describe('purgeOutboxByType', () => {
    it('deletes outbox entries matching UUID and notification type', async () => {
      await purgeOutboxByType('unit-uuid-001', 'INSURANCE_EXPIRY_30D');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications_outbox'),
        ['unit-uuid-001', 'INSURANCE_EXPIRY_30D']
      );
    });
  });
});
