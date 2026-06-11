/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import crypto from 'node:crypto';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from './notification.service';
import db from './db';

vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
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

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.execute).mockResolvedValue([[{ insertId: 1 }], undefined] as any);
  });

  it('should successfully dispatch a notification through all channels to a single user', async () => {
    const persistSpy = vi.spyOn(NotificationService as any, 'persistToSystem');
    const emailSpy = vi.spyOn(NotificationService as any, 'sendEmail');
    const pushSpy = vi.spyOn(NotificationService as any, 'sendPush');

    await NotificationService.dispatch(mockPayload);

    expect(persistSpy).toHaveBeenCalledWith([1], mockPayload);
    expect(emailSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith([1], mockPayload);
    expect(db.execute).toHaveBeenCalled();
  });

  it('should resolve users by permission and dispatch to all of them', async () => {
    // Mock user resolution query to return user IDs 42 and 43
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ id: 42 }, { id: 43 }], undefined] as any) // resolve query
      .mockResolvedValue([[{ insertId: 1 }], undefined] as any); // persist queries

    const payloadWithPermission = {
      permission: 'maint:view',
      type: ArchonNotificationType.MAINTENANCE_ALERT,
      title: 'Alerta de Mantenimiento',
      message: 'Mantenimiento preventivo requerido.',
    };

    const persistSpy = vi.spyOn(NotificationService as any, 'persistToSystem');
    await NotificationService.dispatch(payloadWithPermission);

    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('p.slug = ?'), ['maint:view']);
    expect(persistSpy).toHaveBeenCalledWith([42, 43], payloadWithPermission);
  });

  it('should resolve users by role and dispatch to all of them', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ id: 10 }, { id: 20 }], undefined] as any) // resolve query
      .mockResolvedValue([[{ insertId: 1 }], undefined] as any); // persist queries

    const payloadWithRole = {
      roleId: 2,
      type: ArchonNotificationType.SYSTEM,
      title: 'Mantenimiento Programado',
      message: 'Revisión técnica de flota.',
    };

    const persistSpy = vi.spyOn(NotificationService as any, 'persistToSystem');
    await NotificationService.dispatch(payloadWithRole);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE(ur.role_id, u.role_id) = ?'),
      [2]
    );
    expect(persistSpy).toHaveBeenCalledWith([10, 20], payloadWithRole);
  });

  it('should persist notification to system with default priority if not provided', async () => {
    const payloadNoPriority = { ...mockPayload, priority: undefined };

    await (NotificationService as any).persistToSystem([1], payloadNoPriority);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO system_notifications'),
      expect.arrayContaining([1, ArchonNotificationType.ROUTE_ASSIGNED, 'MEDIUM'])
    );
  });

  it('should handle metadata being null correctly during persistence', async () => {
    const payloadNoMeta = { ...mockPayload, metadata: undefined };

    await (NotificationService as any).persistToSystem([1], payloadNoMeta);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('VALUES (?, ?, ?, ?, ?, ?)'),
      expect.arrayContaining([null])
    );
  });

  it('returns early without dispatching when permission resolves to no users (line 115)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined] as any); // permission query: 0 users
    const persistSpy = vi.spyOn(NotificationService as any, 'persistToSystem');

    await NotificationService.dispatch({
      permission: 'nonexistent:perm',
      type: ArchonNotificationType.SYSTEM,
      title: 'Test',
      message: 'no recipients',
    });

    expect(persistSpy).not.toHaveBeenCalled();
  });

  it('should suppress errors during dispatch to maintain zero-noise policy', async () => {
    const errorSpy = vi
      .spyOn(NotificationService as any, 'persistToSystem')
      .mockRejectedValueOnce(new Error('FAIL'));

    // Should not throw
    await expect(NotificationService.dispatch(mockPayload)).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should execute functional stubs (sendEmail) for coverage', async () => {
    await expect((NotificationService as any).sendEmail()).resolves.toBeUndefined();
  });

  it('should dry-run sendPush when FCM credentials are not configured', async () => {
    const originalEnv = { ...process.env };
    delete process.env.FCM_PROJECT_ID;
    delete process.env.FCM_CLIENT_EMAIL;
    delete process.env.FCM_PRIVATE_KEY;

    const executeSpy = vi.spyOn(db, 'execute');
    await (NotificationService as any).sendPush([1], mockPayload);

    expect(executeSpy).not.toHaveBeenCalled();

    // Restore env
    process.env = originalEnv;
  });
});

// ─── sendPush — FCM credentials configured ───────────────────────────────────

describe('NotificationService.sendPush — with FCM credentials', () => {
  let testPem: string;

  beforeAll(() => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
    testPem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.execute).mockResolvedValue([[{ insertId: 1 }], undefined] as any);
    process.env.FCM_PROJECT_ID = 'test-project';
    process.env.FCM_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.FCM_PRIVATE_KEY = testPem;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FCM_PROJECT_ID;
    delete process.env.FCM_CLIENT_EMAIL;
    delete process.env.FCM_PRIVATE_KEY;
  });

  const payload = {
    userId: 1,
    type: 'ROUTE_ASSIGNED' as any,
    priority: 'HIGH' as any,
    title: 'Test',
    message: 'Test message',
  };

  it('returns early when no push tokens found for user', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined] as any);

    await (NotificationService as any).sendPush([1], payload);

    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('SELECT token'), [1]);
  });

  it('sends FCM notification when token exists and OAuth2 succeeds', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [{ token: 'device-token-abc' }],
      undefined,
    ] as any);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-oauth-token' }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await (NotificationService as any).sendPush([1], payload);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('deletes dead token when FCM returns 400', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ token: 'dead-token-400' }], undefined] as any)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined] as any);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-oauth-token' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 400 });
    vi.stubGlobal('fetch', mockFetch);

    await (NotificationService as any).sendPush([1], payload);

    expect(db.execute).toHaveBeenCalledWith('DELETE FROM user_push_tokens WHERE token = ?', [
      'dead-token-400',
    ]);
  });

  it('deletes dead token when FCM returns 404', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ token: 'dead-token-404' }], undefined] as any)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined] as any);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-oauth-token' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal('fetch', mockFetch);

    await (NotificationService as any).sendPush([1], payload);

    expect(db.execute).toHaveBeenCalledWith('DELETE FROM user_push_tokens WHERE token = ?', [
      'dead-token-404',
    ]);
  });

  it('suppresses individual token send error (inner catch)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[{ token: 'throw-token' }], undefined] as any);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-oauth-token' }),
      })
      .mockRejectedValueOnce(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    await expect((NotificationService as any).sendPush([1], payload)).resolves.not.toThrow();
  });

  it('suppresses OAuth2 failure (outer catch in sendPush)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[{ token: 'some-token' }], undefined] as any);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect((NotificationService as any).sendPush([1], payload)).resolves.not.toThrow();
  });
});
