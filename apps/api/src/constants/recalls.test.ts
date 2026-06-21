import { describe, it, expect } from 'vitest';
import { RECALL_STATUS_ENUM, isValidRecallStatus } from './recalls';

// RC-1..4: catalog_recalls + fleet_unit_recalls schema constants (FC-3 Fase 3B)

describe('RECALL_STATUS_ENUM', () => {
  it('RC-1: contains PENDING as default status for new recalls', () => {
    expect(RECALL_STATUS_ENUM).toContain('PENDING');
  });

  it('RC-2: contains COMPLETED for resolved recalls', () => {
    expect(RECALL_STATUS_ENUM).toContain('COMPLETED');
  });

  it('RC-3: contains NOT_APPLICABLE for units exempt from a recall', () => {
    expect(RECALL_STATUS_ENUM).toContain('NOT_APPLICABLE');
  });

  it('RC-4: enum has exactly 3 values — no undocumented statuses', () => {
    expect(RECALL_STATUS_ENUM).toHaveLength(3);
  });
});

describe('isValidRecallStatus', () => {
  it('RC-5: accepts all valid status values', () => {
    expect(isValidRecallStatus('PENDING')).toBe(true);
    expect(isValidRecallStatus('COMPLETED')).toBe(true);
    expect(isValidRecallStatus('NOT_APPLICABLE')).toBe(true);
  });

  it('RC-6: rejects unknown status strings', () => {
    expect(isValidRecallStatus('OPEN')).toBe(false);
    expect(isValidRecallStatus('CLOSED')).toBe(false);
    expect(isValidRecallStatus('')).toBe(false);
  });
});
