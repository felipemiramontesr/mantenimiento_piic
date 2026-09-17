import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import MfaEnrollmentWizard from './MfaEnrollmentWizard';
import { beginMfaSetup, confirmMfaSetup } from '../../../api/mfa';

/**
 * FC185 F3 — orquestador del asistente (loading → scan → backup). Mockea `api/mfa.ts`
 * directamente (no `api/client.ts`) — límite más limpio, ya probado por separado en
 * `api/mfa.test.ts`.
 */

vi.mock('../../../api/mfa', () => ({
  beginMfaSetup: vi.fn(),
  confirmMfaSetup: vi.fn(),
}));

const SETUP_DATA = { secretBase32: 'SECRET32', otpauthUri: 'otpauth://totp/Archon:x' };

describe('MfaEnrollmentWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el estado de carga y luego el paso de escaneo al resolver /mfa/setup', async () => {
    (beginMfaSetup as Mock).mockResolvedValue(SETUP_DATA);
    render(<MfaEnrollmentWizard onComplete={vi.fn()} />);

    expect(screen.getByTestId('mfa-wizard-loading')).toBeInTheDocument();

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-manual-secret')).toHaveTextContent('SECRET32');
  });

  it('pasa el token explícito a beginMfaSetup (flujo obligatorio con setupToken)', async () => {
    (beginMfaSetup as Mock).mockResolvedValue(SETUP_DATA);
    render(<MfaEnrollmentWizard token="setup-token-1" onComplete={vi.fn()} />);

    await screen.findByTestId('mfa-scan-step');
    expect(beginMfaSetup).toHaveBeenCalledWith('setup-token-1');
  });

  it('muestra un banner de error si /mfa/setup falla al cargar', async () => {
    (beginMfaSetup as Mock).mockRejectedValue(new Error('DOWN'));
    render(<MfaEnrollmentWizard onComplete={vi.fn()} />);

    expect(await screen.findByTestId('mfa-load-error')).toBeInTheDocument();
  });

  it('flujo completo: confirma el código, ve los backups, confirma haberlos guardado y llama a onComplete', async () => {
    (beginMfaSetup as Mock).mockResolvedValue(SETUP_DATA);
    (confirmMfaSetup as Mock).mockResolvedValue(['AAAAA-11111', 'BBBBB-22222']);
    const onComplete = vi.fn();
    render(<MfaEnrollmentWizard token="setup-token-1" onComplete={onComplete} />);

    await screen.findByTestId('mfa-scan-step');
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByTestId('mfa-confirm-submit'));

    expect(await screen.findByTestId('mfa-backup-codes-step')).toBeInTheDocument();
    expect(confirmMfaSetup).toHaveBeenCalledWith('123456', 'setup-token-1');
    expect(screen.getByTestId('mfa-backup-codes-grid')).toHaveTextContent('AAAAA-11111');

    fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
    fireEvent.click(screen.getByTestId('mfa-backup-continue'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('un código incorrecto muestra el error y NO avanza al paso de backups', async () => {
    (beginMfaSetup as Mock).mockResolvedValue(SETUP_DATA);
    (confirmMfaSetup as Mock).mockRejectedValue({ response: { status: 401 } });
    render(<MfaEnrollmentWizard onComplete={vi.fn()} />);

    await screen.findByTestId('mfa-scan-step');
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByTestId('mfa-confirm-submit'));

    await waitFor(() => {
      expect(
        screen.getByText(/Código incorrecto\. Verifica la hora de tu dispositivo/i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mfa-backup-codes-step')).not.toBeInTheDocument();
  });

  it('un error de conexión (no 401) al confirmar muestra el mensaje genérico', async () => {
    (beginMfaSetup as Mock).mockResolvedValue(SETUP_DATA);
    (confirmMfaSetup as Mock).mockRejectedValue(new Error('network'));
    render(<MfaEnrollmentWizard onComplete={vi.fn()} />);

    await screen.findByTestId('mfa-scan-step');
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
      target: { value: '111111' },
    });
    fireEvent.click(screen.getByTestId('mfa-confirm-submit'));

    expect(
      await screen.findByText(/Error de conexión\. Intenta de nuevo más tarde\./i)
    ).toBeInTheDocument();
  });

  it('se desmonta durante la carga sin llamar a setState tras el unmount (guard de cancelación)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let resolveSetup: (v: typeof SETUP_DATA) => void = () => undefined;
    (beginMfaSetup as Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSetup = resolve;
      })
    );
    const { unmount } = render(<MfaEnrollmentWizard onComplete={vi.fn()} />);
    unmount();

    resolveSetup(SETUP_DATA);
    await new Promise((r) => {
      setTimeout(r, 0);
    });

    const stateUpdateWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes("Can't perform a React state update")
    );
    expect(stateUpdateWarning).toBe(false);
    errorSpy.mockRestore();
  });

  it('se desmonta durante la carga y luego /mfa/setup FALLA — el guard también cubre la rama de error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let rejectSetup: (err: Error) => void = () => undefined;
    (beginMfaSetup as Mock).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSetup = reject;
      })
    );
    const { unmount } = render(<MfaEnrollmentWizard onComplete={vi.fn()} />);
    unmount();

    rejectSetup(new Error('DOWN'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });

    const stateUpdateWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes("Can't perform a React state update")
    );
    expect(stateUpdateWarning).toBe(false);
    errorSpy.mockRestore();
  });
});
