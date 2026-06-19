import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';

export interface AuditLogEntry {
  entity_type: 'route_log' | 'user' | 'fleet_unit' | 'catalog';
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  snapshot_before?: Record<string, unknown>;
  snapshot_after?: Record<string, unknown>;
  reason: string;
  user_id: number;
  owner_id?: number;
}

// Fields that must never appear in audit snapshots (PII / security-sensitive)
const SANITIZED_FIELDS = new Set([
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'secret',
  // AES-encrypted fleet fields (§security_rules — never expose raw)
  'placas',
  'numero_serie',
  'numeroSerie',
  'circulation_card_number',
  'circulationCardNumber',
]);

export const sanitizeSnapshot = (
  snapshot: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!snapshot) return undefined;
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [
      key,
      SANITIZED_FIELDS.has(key) ? '[REDACTED]' : value,
    ])
  );
};

/**
 * 🔱 ARCHON AUDIT SERVICE
 * Purpose: Immutable recording of administrative actions.
 */
export const recordAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const query = `
      INSERT INTO administrative_audit_logs
      (uuid, entity_type, entity_id, action, snapshot_before, snapshot_after, reason, user_id, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const before = sanitizeSnapshot(entry.snapshot_before);
    const after = sanitizeSnapshot(entry.snapshot_after);

    await db.query(query, [
      randomUUID(),
      entry.entity_type,
      entry.entity_id,
      entry.action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      entry.reason,
      entry.user_id,
      entry.owner_id ?? null,
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
