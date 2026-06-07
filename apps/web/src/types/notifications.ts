export type NotificationType =
  | 'ROUTE_ASSIGNED'
  | 'ROUTE_STARTED'
  | 'ROUTE_COMPLETED'
  | 'MAINTENANCE_ALERT'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SystemNotification {
  id: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}
