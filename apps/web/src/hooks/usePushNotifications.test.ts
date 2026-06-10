/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '../test/testUtils';
import usePushNotifications from './usePushNotifications';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { success: true } }) },
}));

const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('usePushNotifications', () => {
  const originalNotification = (global as any).Notification;
  const originalLocalStorage = (global as any).localStorage;

  let mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key) => mockLocalStorage[key] || null),
        setItem: vi.fn((key, val) => {
          mockLocalStorage[key] = val;
        }),
        removeItem: vi.fn((key) => {
          delete mockLocalStorage[key];
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    if (originalNotification) {
      (global as any).Notification = originalNotification;
    } else {
      delete (global as any).Notification;
    }
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it('starts with default permission if Notification not in window', () => {
    delete (global as any).Notification;
    const { result } = renderHook(() => usePushNotifications(true));
    expect(result.current.permission).toBe('default');
  });

  it('starts with current Notification permission', () => {
    (global as any).Notification = {
      permission: 'denied',
      requestPermission: vi.fn(),
    };
    const { result } = renderHook(() => usePushNotifications(true));
    expect(result.current.permission).toBe('denied');
  });

  it('registers token on mount if permission is granted', async () => {
    (global as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn(),
    };
    mockLocalStorage.archon_push_token = 'token-123';

    renderHook(() => usePushNotifications(true));
    await flushAsync();

    expect(api.post).toHaveBeenCalledWith('/notifications/push-token', {
      token: 'token-123',
      deviceType: 'web',
    });
  });

  it('requests permission and registers new token if user requests it', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    (global as any).Notification = {
      permission: 'default',
      requestPermission: requestPermissionMock,
    };

    const { result } = renderHook(() => usePushNotifications(true));
    expect(result.current.permission).toBe('default');

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(requestPermissionMock).toHaveBeenCalled();
    expect(result.current.permission).toBe('granted');
    expect(mockLocalStorage.archon_push_token).toContain('web_push_');
    expect(api.post).toHaveBeenCalledWith(
      '/notifications/push-token',
      expect.objectContaining({ deviceType: 'web' })
    );
  });
});
