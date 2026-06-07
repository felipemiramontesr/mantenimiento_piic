import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';

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

export default async function notificationsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });

  // GET /v1/notifications — last 10 for authenticated user
  fastify.get('/notifications', async (request, reply) => {
    const user = request.user as { id: number };
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, type, priority, title, message, metadata, is_read, created_at
         FROM system_notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [user.id]
      );

      const notifications: SystemNotification[] = rows.map((r) => ({
        id: r.id,
        type: r.type as NotificationType,
        priority: r.priority as NotificationPriority,
        title: r.title,
        message: r.message,
        metadata: r.metadata ? (r.metadata as Record<string, unknown>) : null,
        isRead: r.is_read === 1,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      }));

      return reply.send({ success: true, data: notifications });
    } catch {
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' });
    }
  });

  // PATCH /v1/notifications/:id/read — mark as read (owner only)
  fastify.patch('/notifications/:id/read', async (request, reply) => {
    const user = request.user as { id: number };
    const { id } = request.params as { id: string };
    const notifId = parseInt(id, 10);

    if (Number.isNaN(notifId) || notifId <= 0) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: 'Invalid notification id' });
    }

    try {
      const [result] = await db.execute<ResultSetHeader>(
        `UPDATE system_notifications
         SET is_read = TRUE
         WHERE id = ? AND user_id = ?`,
        [notifId, user.id]
      );

      if (result.affectedRows === 0) {
        return reply
          .code(404)
          .send({ success: false, code: 'NOT_FOUND', message: 'Notification not found' });
      }

      return reply.send({ success: true });
    } catch {
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Failed to update notification' });
    }
  });
}
