import api from './client';
import type { SystemNotification } from '../types/notifications';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getNotifications(): Promise<SystemNotification[]> {
  const res = await api.get<ApiEnvelope<SystemNotification[]>>('/notifications');
  return res.data.data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function registerPushToken(
  token: string,
  deviceType: 'web' | 'android' | 'ios' = 'web'
): Promise<void> {
  await api.post('/notifications/push-token', { token, deviceType });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.post('/notifications/push-token/unregister', { token });
}
