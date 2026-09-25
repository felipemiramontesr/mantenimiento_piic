import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import MfaEnrollmentWizard from './MfaEnrollmentWizard';
import {
  beginMfaSetup,
  beginEmailMfaSetup,
  confirmEmailMfaSetup,
  resendEmailMfaCode,
} from '../../../api/mfa';

/**
 * FC195 F3 — enrolamiento del 2FA por correo a través del asistente real (selector de método →
 * código por correo → códigos de respaldo). Mockea `api/mfa.ts` (su contrato HTTP tiene su test).
 */

vi.mock('../../../api/mfa', () => ({
  beginMfaSetup: vi.fn(),
  confirmMfaSetup: vi.fn(),
  beginEmailMfaSetup: vi.fn(),
  confirmEmailMfaSetup: vi.fn(),
  resendEmailMfaCode: vi.fn(),
}));

const SETUP = { emailSetupToken: 'est-1', maskedEmail: 'ar•••@piic.com.mx' };

function renderArcWizard(onComplete = vi.fn()): void {
  render(
    <MfaEnrollmentWizard
      token="setup-1"
      onComplete={onComplete}
      allowedMethods={['totp', 'email']}
    />
  );
}

async function chooseEmail(): Promise<void> {
  fireEvent.click(screen.getByTestId('mfa-method-email'));
  await screen.findByTestId('mfa-email-code-step');
}

function typeCode(value: string): void {
  fireEvent.change(screen.getByLabelText(/código del correo/i), { target: { value } });
}

describe('MfaEnrollmentWizard — 2FA por correo (FC195 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (beginEmailMfaSetup as Mock).mockResolvedValue(SETUP);
  });

  it('Ω/MU (solo totp): entra directo a la app, sin selector', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({ secretBase32: 'S', otpauthUri: 'otpauth://x' });
    render(<MfaEnrollmentWizard token="t" onComplete={vi.fn()} allowedMethods={['totp']} />);

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
    expect(screen.queryByTestId('mfa-method-choice')).not.toBeInTheDocument();
  });

  it('FC195 — con la app ya configurada (409), explica que la tiene activa y quién la restablece', async () => {
    (beginMfaSetup as Mock).mockRejectedValue({ response: { status: 409 } });
    render(<MfaEnrollmentWizard onComplete={vi.fn()} />);

    expect(await screen.findByTestId('mfa-load-error')).toHaveTextContent(
      /Ya tienes la verificación en dos pasos activa/
    );
  });

  it('Arc: muestra el selector y "App" lleva al flujo TOTP', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({ secretBase32: 'S', otpauthUri: 'otpauth://x' });
    renderArcWizard();

    fireEvent.click(screen.getByTestId('mfa-method-totp'));

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
    expect(beginEmailMfaSetup).not.toHaveBeenCalled();
  });

  it('Scenario 1 — correo: envía, muestra el correo enmascarado, confirma y entrega respaldos', async () => {
    (confirmEmailMfaSetup as Mock).mockResolvedValue(['AAAAA-11111']);
    const onComplete = vi.fn();
    renderArcWizard(onComplete);

    fireEvent.click(screen.getByTestId('mfa-method-email'));
    expect(screen.getByTestId('mfa-email-sending')).toBeInTheDocument();
    await screen.findByTestId('mfa-email-code-step');
    expect(screen.getByText('ar•••@piic.com.mx')).toBeInTheDocument();
    expect(beginEmailMfaSetup).toHaveBeenCalledWith('setup-1');

    const confirm = screen.getByTestId('mfa-email-confirm') as HTMLButtonElement;
    typeCode('abcd efg');
    expect(confirm.disabled).toBe(true);
    typeCode('abcd efgh');
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    expect(await screen.findByTestId('mfa-backup-codes-step')).toBeInTheDocument();
    expect(confirmEmailMfaSetup).toHaveBeenCalledWith('est-1', 'ABCDEFGH', 'setup-1');
    fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
    fireEvent.click(screen.getByTestId('mfa-backup-continue'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('código incorrecto: muestra el mensaje del backend y no avanza', async () => {
    (confirmEmailMfaSetup as Mock).mockRejectedValue({
      response: { data: { message: 'El código ingresado no es válido' } },
    });
    renderArcWizard();
    await chooseEmail();

    typeCode('ZZZZZZZZ');
    fireEvent.click(screen.getByTestId('mfa-email-confirm'));

    expect(await screen.findByText('El código ingresado no es válido')).toBeInTheDocument();
    expect(screen.queryByTestId('mfa-backup-codes-step')).not.toBeInTheDocument();
  });

  it('el envío inicial falla (p. ej. sin correo): mensaje del backend y salida a la app', async () => {
    (beginEmailMfaSetup as Mock).mockRejectedValue({
      response: { data: { message: 'Tu cuenta no tiene un correo registrado' } },
    });
    (beginMfaSetup as Mock).mockResolvedValue({ secretBase32: 'S', otpauthUri: 'otpauth://x' });
    renderArcWizard();

    fireEvent.click(screen.getByTestId('mfa-method-email'));
    expect(await screen.findByText('Tu cuenta no tiene un correo registrado')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Usar la app autenticadora'));

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
  });

  it('sin respuesta del servidor: mensaje de conexión', async () => {
    (beginEmailMfaSetup as Mock).mockRejectedValue(new Error('network'));
    renderArcWizard();

    fireEvent.click(screen.getByTestId('mfa-method-email'));

    expect(await screen.findByText(/Error de conexión/)).toBeInTheDocument();
  });

  it('"Usar la app" desde el paso del código cambia al flujo TOTP', async () => {
    (beginMfaSetup as Mock).mockResolvedValue({ secretBase32: 'S', otpauthUri: 'otpauth://x' });
    renderArcWizard();
    await chooseEmail();

    fireEvent.click(screen.getByTestId('mfa-email-back'));

    expect(await screen.findByTestId('mfa-scan-step')).toBeInTheDocument();
  });

  describe('reenvío', () => {
    const resendButton = (): HTMLButtonElement =>
      screen.getByTestId('mfa-email-resend') as HTMLButtonElement;

    /** Deja pasar la espera de 60 s del reenvío, un segundo por vez (cada tick re-programa el siguiente). */
    function passCooldown(): void {
      for (let i = 0; i < 61; i += 1) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
    }

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('recién enviado el código, el reenvío espera 60 s', async () => {
      renderArcWizard();
      await chooseEmail();

      expect(resendButton().disabled).toBe(true);
      expect(resendButton()).toHaveTextContent(/Reenviar código en \d+ s/);
      passCooldown();
      expect(resendButton().disabled).toBe(false);
    });

    it('reenvía con el token del reto y confirma después con el token NUEVO', async () => {
      (resendEmailMfaCode as Mock).mockResolvedValue({
        token: 'est-2',
        maskedEmail: 'ar•••@piic.com.mx',
        codeSent: true,
        resendsLeft: 1,
      });
      (confirmEmailMfaSetup as Mock).mockResolvedValue(['AAAAA-11111']);
      renderArcWizard();
      await chooseEmail();
      typeCode('ABCDEFGH');
      passCooldown();

      fireEvent.click(resendButton());

      await waitFor(() => expect(resendButton()).toHaveTextContent(/en \d+ s/));
      expect(resendEmailMfaCode).toHaveBeenCalledWith('est-1');
      expect((screen.getByLabelText(/código del correo/i) as HTMLInputElement).value).toBe('');
      typeCode('HGFEDCBA');
      fireEvent.click(screen.getByTestId('mfa-email-confirm'));
      await waitFor(() =>
        expect(confirmEmailMfaSetup).toHaveBeenCalledWith('est-2', 'HGFEDCBA', 'setup-1')
      );
    });

    it('si el correo reenviado no salió, lo avisa', async () => {
      (resendEmailMfaCode as Mock).mockResolvedValue({
        token: 'est-2',
        maskedEmail: 'ar•••@piic.com.mx',
        codeSent: false,
        resendsLeft: 0,
      });
      renderArcWizard();
      await chooseEmail();
      passCooldown();

      fireEvent.click(resendButton());

      expect(await screen.findByText(/No pudimos enviar el correo/)).toBeInTheDocument();
      expect(resendButton()).toHaveTextContent('Ya no quedan reenvíos');
    });

    it('el backend rechaza el reenvío (429): muestra su mensaje', async () => {
      (resendEmailMfaCode as Mock).mockRejectedValue({
        response: { data: { message: 'Ya no quedan reenvíos — inicia de nuevo' } },
      });
      renderArcWizard();
      await chooseEmail();
      passCooldown();

      fireEvent.click(resendButton());

      expect(
        await screen.findByText('Ya no quedan reenvíos — inicia de nuevo')
      ).toBeInTheDocument();
    });
  });

  it('se desmonta mientras envía el código: no toca estado tras el unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let resolveSetup: (v: typeof SETUP) => void = () => undefined;
    (beginEmailMfaSetup as Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSetup = resolve;
      })
    );
    const { unmount } = render(
      <MfaEnrollmentWizard token="t" onComplete={vi.fn()} allowedMethods={['totp', 'email']} />
    );
    fireEvent.click(screen.getByTestId('mfa-method-email'));
    unmount();

    resolveSetup(SETUP);
    await new Promise((r) => {
      setTimeout(r, 0);
    });

    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('unmounted'))).toBe(false);
    errorSpy.mockRestore();
  });

  it('se desmonta mientras envía y el envío FALLA: el guard cubre también el error', async () => {
    let rejectSetup: (e: Error) => void = () => undefined;
    (beginEmailMfaSetup as Mock).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSetup = reject;
      })
    );
    const { unmount } = render(
      <MfaEnrollmentWizard token="t" onComplete={vi.fn()} allowedMethods={['totp', 'email']} />
    );
    fireEvent.click(screen.getByTestId('mfa-method-email'));
    unmount();

    rejectSetup(new Error('DOWN'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
    expect(beginEmailMfaSetup).toHaveBeenCalledTimes(1);
  });
});
