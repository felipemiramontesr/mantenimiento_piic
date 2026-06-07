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
