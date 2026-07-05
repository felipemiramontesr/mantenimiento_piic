import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import db from './db';
import { outboundFetch } from './outboundFetch';

/**
 * 🔱 Archon Intelligence: Notification Service
 * Domain: Fleet Communications (v.2.0.0)
 * Purpose: Centralized orchestration for Email, Push, and System Alerts.
 */

/* eslint-disable no-shadow */
export enum ArchonNotificationType {
  ROUTE_ASSIGNED = 'ROUTE_ASSIGNED',
  ROUTE_STARTED = 'ROUTE_STARTED',
  ROUTE_COMPLETED = 'ROUTE_COMPLETED',
  MAINTENANCE_ALERT = 'MAINTENANCE_ALERT',
  SYSTEM = 'SYSTEM',
}

export enum ArchonNotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
/* eslint-enable no-shadow */

export interface NotificationPayload {
  userId?: number;
  permission?: string;
  roleId?: number;
  type: ArchonNotificationType;
  priority?: ArchonNotificationPriority;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// OAuth2 helper for Google service account using native crypto
function generateJWT(clientEmail: string, privateKey: string): string {
  const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
  const encodedHeader = Buffer.from(header).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const claim = JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });
  const encodedClaim = Buffer.from(claim).toString('base64url');

  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${encodedHeader}.${encodedClaim}`);
  const signature = sign.sign(formattedKey, 'base64url');

  return `${encodedHeader}.${encodedClaim}.${signature}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwtToken = generateJWT(clientEmail, privateKey);
  // FC 062 F4 (A10) — salida vía outboundFetch (allowlist + anti-rebinding + breaker)
  const response = await outboundFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Failed to obtain FCM access token: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

class NotificationService {
  /**
   * 🛡️ DISPATCH: The core method for alerting users.
   */
  static async dispatch(payload: NotificationPayload): Promise<void> {
    try {
      // 1. Resolve target User IDs based on routing/targeting options
      let userIds: number[] = [];

      if (payload.userId !== undefined) {
        userIds.push(payload.userId);
      } else if (payload.permission !== undefined) {
        // Resolve users holding role(s) linked to this permission slug,
        // direct roles, or master bypass role (id = 0)
        const query = `
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN role_permissions rp ON rp.role_id = COALESCE(ur.role_id, u.role_id)
          LEFT JOIN permissions p ON rp.permission_id = p.id
          WHERE p.slug = ?
             OR COALESCE(ur.role_id, u.role_id) = 0
        `;
        const [rows] = await db.execute<RowDataPacket[]>(query, [payload.permission]);
        userIds = rows.map((r) => r.id as number);
      } else if (payload.roleId !== undefined) {
        const query = `
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          WHERE COALESCE(ur.role_id, u.role_id) = ?
        `;
        const [rows] = await db.execute<RowDataPacket[]>(query, [payload.roleId]);
        userIds = rows.map((r) => r.id as number);
      }

      if (userIds.length === 0) return;

      // 2. Persist to Dashboard Feed (Database) for all target users
      await this.persistToSystem(userIds, payload);

      // 3. Trigger Email Flow (Hook)
      await this.sendEmail();

      // 4. Trigger Push Notification (FCM Bridge)
      await this.sendPush(userIds, payload);
    } catch (error: unknown) {
      // Failure suppressed to maintain industrial zero-noise policy
    }
  }

  private static async persistToSystem(
    userIds: number[],
    payload: NotificationPayload
  ): Promise<void> {
    const query = `
      INSERT INTO system_notifications (user_id, type, priority, title, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const promises = userIds.map((userId) =>
      db.execute(query, [
        userId,
        payload.type,
        payload.priority || 'MEDIUM',
        payload.title,
        payload.message,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ])
    );
    await Promise.all(promises);
  }

  private static async sendEmail(): Promise<void> {
    // 🔱 Archon Bridge: Email logic goes here (Nodemailer/SendGrid)
    // For now, it stays as a functional stub to prevent build breaks.
  }

  private static async sendPush(userIds: number[], payload: NotificationPayload): Promise<void> {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      // local development warning to keep it noiseless
      return;
    }

    try {
      const placeholders = userIds.map(() => '?').join(',');
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT token FROM user_push_tokens WHERE user_id IN (${placeholders})`,
        userIds
      );
      const tokens = rows.map((r) => r.token as string);
      if (tokens.length === 0) return;

      const accessToken = await getAccessToken(clientEmail, privateKey);

      const promises = tokens.map(async (token) => {
        try {
          // FC 062 F4 (A10) — salida vía outboundFetch (allowlist + anti-rebinding + breaker)
          const response = await outboundFetch(
            `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title: payload.title,
                    body: payload.message,
                  },
                  data: {
                    type: payload.type,
                    priority: payload.priority || 'MEDIUM',
                    metadata: payload.metadata ? JSON.stringify(payload.metadata) : '',
                  },
                },
              }),
            }
          );
          if (!response.ok) {
            if (response.status === 400 || response.status === 404) {
              // Clean up dead/unregistered tokens from the database
              await db.execute('DELETE FROM user_push_tokens WHERE token = ?', [token]);
            }
          }
        } catch (err) {
          // Suppress individual token failure to maintain zero-noise
        }
      });

      await Promise.all(promises);
    } catch (error) {
      // Suppress broad failures
    }
  }
}

export default NotificationService;
