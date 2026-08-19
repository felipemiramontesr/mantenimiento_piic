import api from './client';

/** Registers this device's FCM push token with the backend. */
export default async function registerPushToken(
  token: string,
  deviceType: 'web' | 'android' | 'ios' = 'web'
): Promise<void> {
  await api.post('/notifications/push-token', { token, deviceType });
}
