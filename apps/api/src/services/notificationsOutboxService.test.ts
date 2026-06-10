import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from './db';
import NotificationService from './notification.service';
import { processPendingAlerts, purgeOutboxForOrder } from './notificationsOutboxService';

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));

vi.mock('./notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT' },
  ArchonNotificationPriority: { MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
}));

describe('NotificationsOutboxService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([[], undefined]);
  });

  describe('processPendingAlerts', () => {
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
      (db.execute as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([[]]) // OPEN orders (none)
        .mockResolvedValueOnce([[]]); // ACTIVE orders (none)

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

  describe('purgeOutboxForOrder', () => {
    it('deletes all outbox entries for the given order UUID', async () => {
      (db.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([[], undefined]);

      await purgeOutboxForOrder('ORD-DONE');

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications_outbox'),
        ['ORD-DONE']
      );
    });
  });
});
