export const RECALL_STATUS_ENUM = ['PENDING', 'COMPLETED', 'NOT_APPLICABLE'] as const;

export type RecallStatus = (typeof RECALL_STATUS_ENUM)[number];

export function isValidRecallStatus(value: string): value is RecallStatus {
  return (RECALL_STATUS_ENUM as readonly string[]).includes(value);
}
