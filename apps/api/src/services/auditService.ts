import { RowDataPacket } from 'mysql2';
import db from './db';

export interface AuditLogEntry {
  entity_type: 'route_log' | 'user' | 'fleet_unit' | 'catalog';
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  snapshot_before?: Record<string, unknown>;
  snapshot_after?: Record<string, unknown>;
  reason: string;
  user_id: number;
}

/**
 * 🔱 ARCHON AUDIT SERVICE
 * Purpose: Immutable recording of administrative actions.
 */
export const recordAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const query = `
      INSERT INTO administrative_audit_logs 
      (entity_type, entity_id, action, snapshot_before, snapshot_after, reason, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(query, [
      entry.entity_type,
      entry.entity_id,
      entry.action,
      entry.snapshot_before ? JSON.stringify(entry.snapshot_before) : null,
      entry.snapshot_after ? JSON.stringify(entry.snapshot_after) : null,
      entry.reason,
      entry.user_id,
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('🔱 [Audit Error]: Failed to record forensic trace.', err);
    // In Archon, we don't block the main action if audit fails,
    // but we log it with maximum severity in terminal.
  }
};

/**
 * Retrieves forensic history for a specific entity.
 */
export const getEntityAuditHistory = async (type: string, id: string): Promise<RowDataPacket[]> => {
  const [rows] = await db.query(
    'SELECT * FROM administrative_audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
    [type, id]
  );
  return rows as RowDataPacket[];
};
