/* global NotificationPermission */
import { useState, useEffect, useCallback } from 'react';
import { registerPushToken } from '../api/notifications';

interface UsePushNotificationsResult {
  permission: NotificationPermission;
  token: string | null;
  requestPermission: () => Promise<void>;
}

export default function usePushNotifications(isAuthenticated: boolean): UsePushNotificationsResult {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(null);

  const registerToken = useCallback(async (tokenValue: string): Promise<void> => {
    try {
      await registerPushToken(tokenValue, 'web');
      setToken(tokenValue);
    } catch {
      // silent fail per zero-noise
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted' && isAuthenticated) {
        let savedToken = localStorage.getItem('archon_push_token');
        if (!savedToken) {
          savedToken = `web_push_${crypto.randomUUID()}`;
          localStorage.setItem('archon_push_token', savedToken);
        }
        await registerToken(savedToken);
      }
    } catch {
      // silent
    }
  }, [isAuthenticated, registerToken]);

  useEffect(() => {
    if (permission === 'granted' && isAuthenticated) {
      let savedToken = localStorage.getItem('archon_push_token');
      if (!savedToken) {
        savedToken = `web_push_${crypto.randomUUID()}`;
        localStorage.setItem('archon_push_token', savedToken);
      }
      registerToken(savedToken);
    }
  }, [permission, isAuthenticated, registerToken]);

  return { permission, token, requestPermission };
}
