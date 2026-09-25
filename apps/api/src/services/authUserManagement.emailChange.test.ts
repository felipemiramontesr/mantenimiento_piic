import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import EncryptionService from './encryption';
import db from './db';
import * as UserRepository from './authUserManagement.repository';
import * as MfaRepository from './mfa.repository';
import { updateUser } from './authUserManagement.service';

/**
 * FC196 F2 — PATCH /users/:id: si el correo CAMBIA, en la misma transacción se reinicia su
 * verificación y su 2FA por correo (Tabla de verdad 2: R_RST ≡ R_PRG-candidato ≡ Δ_EM) y el
 * resultado trae el cambio para que la ruta avise al buzón anterior. Usa el `EncryptionService`
 * real: el correo guardado viene cifrado y la comparación debe hacerse contra el descifrado.
 */

const conn = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./authUserManagement.repository', () => ({
  findUserForUpdateById: vi.fn(),
  updateUserFields: vi.fn(),
  findUserById: vi.fn(),
}));
vi.mock('./mfa.repository', () => ({ resetEmailFactor: vi.fn() }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

const OMEGA_ADMIN = { id: 1, roleId: 0, permissions: ['*'] } as never;

function givenStoredEmail(email: string | null): void {
  (UserRepository.findUserForUpdateById as Mock).mockResolvedValue({
    id: 30,
    email: email === null ? null : EncryptionService.encrypt(email),
  });
}

describe('FC196 F2 — updateUser y el cambio de correo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (UserRepository.findUserById as Mock).mockResolvedValue({ id: 30 });
  });

  it('Scenario 3 — correo distinto: reinicia verificación y 2FA por correo en la MISMA transacción', async () => {
    givenStoredEmail('arc.viejo@piic.com.mx');

    const result = await updateUser(
      '30',
      { email: 'arc.nuevo@piic.com.mx' },
      'cambio',
      OMEGA_ADMIN
    );

    expect(MfaRepository.resetEmailFactor).toHaveBeenCalledWith(30, conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      emailChange: { previous: 'arc.viejo@piic.com.mx', next: 'arc.nuevo@piic.com.mx' },
    });
  });

  it('el mismo correo con otras mayúsculas o espacios NO es un cambio', async () => {
    givenStoredEmail('Arc@Piic.com.mx');

    const result = await updateUser(
      '30',
      { email: ' arc@piic.com.mx ' },
      'sin cambio',
      OMEGA_ADMIN
    );

    expect(MfaRepository.resetEmailFactor).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('Scenario 6 — PATCH sin correo (solo nombre): 2FA y verificación intactos', async () => {
    givenStoredEmail('arc@piic.com.mx');

    const result = await updateUser('30', { fullName: 'Nuevo Nombre' }, 'nombre', OMEGA_ADMIN);

    expect(MfaRepository.resetEmailFactor).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('sin correo previo: también reinicia, y el cambio no tiene a quién avisar', async () => {
    givenStoredEmail(null);

    const result = await updateUser(
      '30',
      { email: 'arc@piic.com.mx' },
      'alta de correo',
      OMEGA_ADMIN
    );

    expect(MfaRepository.resetEmailFactor).toHaveBeenCalledWith(30, conn);
    expect(result).toEqual({ ok: true, emailChange: { previous: null, next: 'arc@piic.com.mx' } });
  });

  it('Invariante 3 — si el reinicio falla, se revierte también el cambio de correo', async () => {
    givenStoredEmail('arc.viejo@piic.com.mx');
    (MfaRepository.resetEmailFactor as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));

    await expect(
      updateUser('30', { email: 'arc.nuevo@piic.com.mx' }, 'cambio', OMEGA_ADMIN)
    ).rejects.toThrow('DB_DOWN');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
});
