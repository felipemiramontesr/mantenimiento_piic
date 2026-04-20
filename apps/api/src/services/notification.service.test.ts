/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from './notification.service';
import db from './db';

vi.mock('./db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  },
}));

describe('NotificationService (Intelligence Orchestrator)', () => {
  const mockPayload = {
    userId: 1,
    type: ArchonNotificationType.ROUTE_ASSIGNED,
    priority: ArchonNotificationPriority.HIGH,
    title: 'Ruta Asignada',
    message: 'Se te ha asignado una nueva unidad para despacho.',
    metadata: { routeId: 101 },
  };

  it('should successfully dispatch a notification through all channels', async () => {
    const persistSpy = vi.spyOn(NotificationService as any, 'persistToSystem');
    const emailSpy = vi.spyOn(NotificationService as any, 'sendEmail');
    const pushSpy = vi.spyOn(NotificationService as any, 'sendPush');

    await NotificationService.dispatch(mockPayload);

    expect(persistSpy).toHaveBeenCalledWith(mockPayload);
    expect(emailSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalled();
  });

  it('should persist notification to system with default priority if not provided', async () => {
    const payloadNoPriority = { ...mockPayload, priority: undefined };

    await (NotificationService as any).persistToSystem(payloadNoPriority);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO system_notifications'),
      expect.arrayContaining([1, ArchonNotificationType.ROUTE_ASSIGNED, 'MEDIUM'])
    );
  });

  it('should handle metadata being null correctly during persistence', async () => {
    const payloadNoMeta = { ...mockPayload, metadata: undefined };

    await (NotificationService as any).persistToSystem(payloadNoMeta);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('VALUES (?, ?, ?, ?, ?, ?)'),
      expect.arrayContaining([null])
    );
  });

  it('should suppress errors during dispatch to maintain zero-noise policy', async () => {
    const errorSpy = vi
      .spyOn(NotificationService as any, 'persistToSystem')
      .mockRejectedValueOnce(new Error('FAIL'));

    // Should not throw
    await expect(NotificationService.dispatch(mockPayload)).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should execute functional stubs (sendEmail, sendPush) for coverage', async () => {
    // These methods currently return Promise<void> and do nothing
    await expect((NotificationService as any).sendEmail()).resolves.toBeUndefined();
    await expect((NotificationService as any).sendPush()).resolves.toBeUndefined();
  });
});
