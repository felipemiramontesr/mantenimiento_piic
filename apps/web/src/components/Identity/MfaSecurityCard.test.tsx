import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import MfaSecurityCard from './MfaSecurityCard';
import { beginMfaSetup, confirmMfaSetup } from '../../api/mfa';

/**
 * FC185 F3 — entrada voluntaria al asistente de MFA desde Configuración de Identidad. Mockea
 * `api/mfa.ts` (el mismo límite que `MfaEnrollmentWizard.test.tsx`) para probar el ciclo completo
 * abrir → completar → cerrar sin re-probar la lógica interna del asistente.
 */

vi.mock('../../api/mfa', () => ({
  beginMfaSetup: vi.fn(),
  confirmMfaSetup: vi.fn(),
}));

describe('MfaSecurityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el asistente NO está montado hasta que se abre (0 llamada a beginMfaSetup)', () => {
    render(<MfaSecurityCard />);
    expect(screen.getByTestId('mfa-security-card-open')).toBeInTheDocument();
    expect(beginMfaSetup).not.toHaveBeenCalled();
  });

  it('al hacer click abre el modal y monta el asistente (sin token — usa la sesión real vía interceptor)', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({
      secretBase32: 'SECRET32',
      otpauthUri: 'otpauth://totp/x',
    });
    render(<MfaSecurityCard />);

    fireEvent.click(screen.getByTestId('mfa-security-card-open'));

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
    expect(beginMfaSetup).toHaveBeenCalledWith(undefined);
  });

  it('completar el asistente cierra el modal y muestra el banner de éxito', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({
      secretBase32: 'SECRET32',
      otpauthUri: 'otpauth://totp/x',
    });
    (confirmMfaSetup as Mock).mockResolvedValue(['AAAAA-11111']);
    render(<MfaSecurityCard />);

    fireEvent.click(screen.getByTestId('mfa-security-card-open'));
    await screen.findByTestId('mfa-scan-step');
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByTestId('mfa-confirm-submit'));
    await screen.findByTestId('mfa-backup-codes-step');
    fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
    fireEvent.click(screen.getByTestId('mfa-backup-continue'));

    expect(screen.queryByTestId('mfa-scan-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('mfa-security-card-success')).toBeInTheDocument();
  });

  it('cerrar el modal (Escape) sin completar no muestra el banner de éxito', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({
      secretBase32: 'SECRET32',
      otpauthUri: 'otpauth://totp/x',
    });
    render(<MfaSecurityCard />);

    fireEvent.click(screen.getByTestId('mfa-security-card-open'));
    await screen.findByTestId('mfa-scan-step');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('mfa-scan-step')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mfa-security-card-success')).not.toBeInTheDocument();
  });
});
