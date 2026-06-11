import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '../test/testUtils';
import useNotifications from './useNotifications';
import * as notificationsApi from '../api/notifications';
import type { SystemNotification } from '../types/notifications';

vi.mock('../api/notifications', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const mockNotifications: SystemNotification[] = [
  {
    id: 1,
    type: 'SYSTEM',
    priority: 'LOW',
    title: 'Aviso 1',
    message: 'Mensaje 1',
    metadata: null,
    isRead: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    type: 'MAINTENANCE_ALERT',
    priority: 'HIGH',
    title: 'Aviso 2',
    message: 'Mensaje 2',
    metadata: null,
    isRead: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notifications on mount and populates the list', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotifications);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(notificationsApi.getNotifications).toHaveBeenCalledOnce();
    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('loading is false after fetch completes', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue([]);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(result.current.loading).toBe(false);
  });

  it('silences errors during refresh and leaves notifications empty', async () => {
    vi.mocked(notificationsApi.getNotifications).mockRejectedValue(new Error('Network'));
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('computes unreadCount from loaded notifications', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotifications);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(result.current.unreadCount).toBe(1);
  });

  it('unreadCount is 0 when all notifications are read', async () => {
    const allRead = mockNotifications.map((n) => ({ ...n, isRead: true }));
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(allRead);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(result.current.unreadCount).toBe(0);
  });

  it('markAsRead updates the target notification to isRead:true', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsApi.markNotificationRead).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    await act(async () => {
      await result.current.markAsRead(1);
    });
    expect(notificationsApi.markNotificationRead).toHaveBeenCalledWith(1);
    expect(result.current.notifications.find((n) => n.id === 1)?.isRead).toBe(true);
    expect(result.current.notifications.find((n) => n.id === 2)?.isRead).toBe(true);
  });

  it('silences markAsRead errors and leaves notification unchanged', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsApi.markNotificationRead).mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    await act(async () => {
      await result.current.markAsRead(1);
    });
    expect(result.current.notifications.find((n) => n.id === 1)?.isRead).toBe(false);
  });

  it('markAllRead marks every unread notification as read via Promise.allSettled', async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotifications);
    vi.mocked(notificationsApi.markNotificationRead).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    await act(async () => {
      await result.current.markAllRead();
    });
    expect(notificationsApi.markNotificationRead).toHaveBeenCalledWith(1);
    expect(notificationsApi.markNotificationRead).not.toHaveBeenCalledWith(2);
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('refresh can be called manually to reload the list', async () => {
    vi.mocked(notificationsApi.getNotifications)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockNotifications);
    const { result } = renderHook(() => useNotifications());
    await flushAsync();
    expect(result.current.notifications).toEqual([]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    expect(result.current.notifications).toEqual(mockNotifications);
  });
});
