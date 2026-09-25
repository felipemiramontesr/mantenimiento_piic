import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import EncryptionService from './encryption';
import { recordAuditLog } from './auditService';
import { MemoryMailTransport, MailTransport } from './mailTransport';
import { detectEmailChange, notifyPreviousAddress } from './emailChange.service';
import { resetEmailFactor } from './mfa.repository';

/**
 * FC196 F2 — detección del cambio de correo, aviso al buzón anterior (Scenario 5, Invariante 4) y
 * el reinicio del factor de correo en el repositorio (Invariante 2/3).
 */

vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const NOW = new Date('2026-09-25T18:00:00.000Z');
const CHANGE = { previous: 'arc.viejo@piic.com.mx', next: 'arc.nuevo@piic.com.mx' };

describe('detectEmailChange', () => {
  it('sin correo en el PATCH ⇒ null', () => {
    expect(detectEmailChange(EncryptionService.encrypt('a@b.mx'), undefined)).toBeNull();
  });

  it('compara contra el correo DESCIFRADO, sin distinguir mayúsculas ni espacios', () => {
    const stored = EncryptionService.encrypt('Arc@Piic.com.mx');
    expect(detectEmailChange(stored, ' arc@piic.com.mx ')).toBeNull();
    expect(detectEmailChange(stored, 'otro@piic.com.mx')).toEqual({
      previous: 'Arc@Piic.com.mx',
      next: 'otro@piic.com.mx',
    });
  });

  it.each([[null], [''], [42]])(
    'sin correo guardado usable (%s) ⇒ cambio sin anterior',
    (stored) => {
      expect(detectEmailChange(stored, 'nuevo@piic.com.mx')).toEqual({
        previous: null,
        next: 'nuevo@piic.com.mx',
      });
    }
  );
});

describe('notifyPreviousAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 5 — avisa al buzón ANTERIOR, solo informativo y con el nuevo enmascarado', async () => {
    const transport = new MemoryMailTransport();

    const status = await notifyPreviousAddress({
      transport,
      change: CHANGE,
      targetUserId: 30,
      adminId: 7,
      now: NOW,
    });

    expect(status).toBe('sent');
    const [mail] = transport.outbox;
    expect(mail.to).toBe('arc.viejo@piic.com.mx');
    expect(mail.text).toContain('ar•••@piic.com.mx');
    expect(mail.text).not.toContain('arc.nuevo@piic.com.mx');
    expect(mail.text).toContain('2026-09-25T18:00:00.000Z');
    expect(mail.text).toContain('ID 7');
    expect(mail.html).not.toContain('<a ');
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_id: '30',
        user_id: 7,
        snapshot_after: { emailChangeNotice: 'sent' },
      })
    );
  });

  it('usa la hora actual si no se le pasa una', async () => {
    const transport = new MemoryMailTransport();

    await notifyPreviousAddress({ transport, change: CHANGE, targetUserId: 30, adminId: 7 });

    expect(transport.outbox[0].text).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('sin correo anterior no hay a quién avisar ⇒ skipped, sin enviar ni auditar', async () => {
    const transport = new MemoryMailTransport();

    const status = await notifyPreviousAddress({
      transport,
      change: { previous: null, next: 'n@piic.com.mx' },
      targetUserId: 30,
      adminId: 7,
    });

    expect(status).toBe('skipped');
    expect(transport.outbox).toHaveLength(0);
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('Invariante 4 — el SMTP falla ⇒ "failed" auditado, sin lanzar', async () => {
    const failing: MailTransport = {
      send: () => Promise.resolve({ status: 'failed', reason: 'ETIMEDOUT' }),
    };

    const status = await notifyPreviousAddress({
      transport: failing,
      change: CHANGE,
      targetUserId: 30,
      adminId: 7,
    });

    expect(status).toBe('failed');
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ snapshot_after: { emailChangeNotice: 'failed' } })
    );
  });

  it('si la auditoría falla tampoco lanza ⇒ "failed"', async () => {
    (recordAuditLog as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));

    const status = await notifyPreviousAddress({
      transport: new MemoryMailTransport(),
      change: CHANGE,
      targetUserId: 30,
      adminId: 7,
    });

    expect(status).toBe('failed');
  });
});

describe('resetEmailFactor (Invariante 2/3)', () => {
  const execute = vi.fn();
  const executor = { execute } as never;

  beforeEach(() => {
    execute.mockReset();
  });

  it('con credencial email: quita verificación, credencial, respaldos sin otro método y retos', async () => {
    execute
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 8 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    expect(await resetEmailFactor(30, executor)).toBe(true);

    expect(execute).toHaveBeenNthCalledWith(
      1,
      'UPDATE users SET email_verified_at = NULL WHERE id = ?',
      [30]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM user_mfa_credentials WHERE user_id = ? AND type = 'email'",
      [30]
    );
    const [backupSql, backupParams] = execute.mock.calls[2];
    expect(backupSql).toContain('DELETE FROM user_mfa_backup_codes');
    expect(backupSql).toContain('NOT EXISTS');
    expect(backupParams).toEqual([30, 30]);
    expect(execute).toHaveBeenNthCalledWith(
      4,
      "UPDATE mfa_challenges SET revoked = 1 WHERE user_id = ? AND channel = 'email' AND revoked = 0",
      [30]
    );
  });

  it('sin credencial email (p. ej. TOTP): solo verificación y retos; respaldos intactos', async () => {
    execute
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 0 }, []])
      .mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    expect(await resetEmailFactor(30, executor)).toBe(false);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls.map(([sql]) => String(sql))).not.toContain(
      expect.stringContaining('user_mfa_backup_codes')
    );
  });
});
