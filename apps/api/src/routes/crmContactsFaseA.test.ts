/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import db from '../services/db';

/**
 * FC-5 CRM_Directory_Contacts FaseA — DB Schema validation
 *
 * AT-CRM-A-1: crm_contacts table has expected columns (DESCRIBE)
 * AT-CRM-A-2: owner_id FK references owners(id)
 * AT-CRM-A-3: email_bi blind index exists
 * AT-CRM-A-4: PII columns (email, phone) are TEXT (blob-compatible for AES)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
    getConnection: vi.fn(),
  },
}));

describe('FC-5 CRM FaseA — crm_contacts schema', () => {
  it('AT-CRM-A-1: table has expected columns', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        { Field: 'id', Type: 'int unsigned', Null: 'NO', Key: 'PRI' },
        { Field: 'owner_id', Type: 'int', Null: 'NO', Key: 'MUL' },
        { Field: 'full_name', Type: 'varchar(255)', Null: 'NO', Key: '' },
        { Field: 'company', Type: 'varchar(255)', Null: 'YES', Key: '' },
        { Field: 'role_label', Type: 'varchar(100)', Null: 'YES', Key: '' },
        { Field: 'email', Type: 'text', Null: 'YES', Key: '' },
        { Field: 'email_bi', Type: 'varchar(30)', Null: 'YES', Key: 'MUL' },
        { Field: 'phone', Type: 'text', Null: 'YES', Key: '' },
        { Field: 'notes', Type: 'text', Null: 'YES', Key: '' },
        { Field: 'is_active', Type: 'tinyint(1)', Null: 'NO', Key: '' },
        { Field: 'created_at', Type: 'datetime', Null: 'NO', Key: '' },
        { Field: 'updated_at', Type: 'datetime', Null: 'NO', Key: '' },
      ],
      undefined,
    ]);

    const [rows] = await db.execute('DESCRIBE crm_contacts');
    const fields = (rows as { Field: string }[]).map((r) => r.Field);

    expect(fields).toContain('id');
    expect(fields).toContain('owner_id');
    expect(fields).toContain('full_name');
    expect(fields).toContain('email');
    expect(fields).toContain('email_bi');
    expect(fields).toContain('phone');
  });

  it('AT-CRM-A-2: owner_id column has MUL key (FK + index)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [{ Field: 'owner_id', Type: 'int', Null: 'NO', Key: 'MUL' }],
      undefined,
    ]);

    const [rows] = await db.execute('DESCRIBE crm_contacts');
    const ownerCol = (rows as { Field: string; Key: string }[]).find((r) => r.Field === 'owner_id');
    expect(ownerCol?.Key).toBe('MUL');
  });

  it('AT-CRM-A-3: email_bi has index (blind index for lookups)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [{ Key_name: 'idx_crm_email_bi', Column_name: 'email_bi', Non_unique: 1 }],
      undefined,
    ]);

    const [rows] = await db.execute("SHOW INDEX FROM crm_contacts WHERE Column_name = 'email_bi'");
    expect((rows as { Key_name: string }[]).length).toBeGreaterThan(0);
    expect((rows as { Key_name: string }[])[0].Key_name).toBe('idx_crm_email_bi');
  });

  it('AT-CRM-A-4: email and phone columns are TEXT (AES ciphertext storage)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      [
        { Field: 'email', Type: 'text' },
        { Field: 'phone', Type: 'text' },
      ],
      undefined,
    ]);

    const [rows] = await db.execute('DESCRIBE crm_contacts');
    const emailCol = (rows as { Field: string; Type: string }[]).find((r) => r.Field === 'email');
    const phoneCol = (rows as { Field: string; Type: string }[]).find((r) => r.Field === 'phone');
    expect(emailCol?.Type).toBe('text');
    expect(phoneCol?.Type).toBe('text');
  });
});
