import db from './db';

/**
 * 🔱 Archon Intelligence: Notification Service
 * Domain: Fleet Communications (v.1.1.2)
 * Purpose: Centralized orchestration for Email, Push, and System Alerts.
 */

export enum NotificationType {
  ROUTE_ASSIGNED = 'ROUTE_ASSIGNED',
  ROUTE_STARTED = 'ROUTE_STARTED',
  ROUTE_COMPLETED = 'ROUTE_COMPLETED',
  MAINTENANCE_ALERT = 'MAINTENANCE_ALERT',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

interface NotificationPayload {
  userId: number;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

class NotificationService {
  /**
   * 🛡️ DISPATCH: The core method for alerting users.
   */
  static async dispatch(payload: NotificationPayload): Promise<void> {
    try {
      // 1. Persist to Dashboard Feed (Database)
      await this.persistToSystem(payload);

      // 2. Trigger Email Flow (Hook)
      await this.sendEmail(payload);

      // 3. Trigger Push Notification (Future Mobile Bridge)
      await this.sendPush(payload);

      console.log(`[NotificationService] Alert dispatched: ${payload.type} to User ID ${payload.userId}`);
    } catch (error) {
      console.error('[NotificationService] Failed to dispatch alert:', error);
    }
  }

  private static async persistToSystem(payload: NotificationPayload): Promise<void> {
    const query = `
      INSERT INTO system_notifications (user_id, type, priority, title, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(query, [
      payload.userId,
      payload.type,
      payload.priority || 'MEDIUM',
      payload.title,
      payload.message,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    ]);
  }

  private static async sendEmail(payload: NotificationPayload): Promise<void> {
    // 🔱 Archon Bridge: Email logic goes here (Nodemailer/SendGrid)
    // For now, it stays as a functional stub to prevent build breaks.
    console.log(`[Email Hub] Simulating mission email to user ${payload.userId}: ${payload.title}`);
  }

  private static async sendPush(payload: NotificationPayload): Promise<void> {
    // 🔱 Archon Bridge: Push logic for Android Hybrid App (Firebase)
    // Ready for integration once the mobile manifest is finalized.
  }
}

export default NotificationService;
