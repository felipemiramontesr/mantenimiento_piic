import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import useMfaChallenge from './useMfaChallenge';
import { resendEmailMfaCode } from '../../api/mfa';

/**
 * FC195 F3 — reto de login por correo: el canal y la vida del reto (10 min), el aviso si el correo
 * no salió y el reenvío (token nuevo que reemplaza al anterior, espera de 60 s).
 */

vi.mock('../../api/mfa', () => ({
  verifyMfaChallenge: vi.fn(),
  resendEmailMfaCode: vi.fn(),
}));

const EMAIL_INFO = { channel: 'email' as const, maskedEmail: 'ar•••@piic.com.mx', codeSent: true };

function flush(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
  });
}

describe('useMfaChallenge — canal de correo (FC195 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() con correo: 10 minutos, correo enmascarado y reenvío en espera', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));

    act(() => result.current.start('mfa-1', EMAIL_INFO));

    expect(result.current.secondsRemaining).toBe(600);
    expect(result.current.email.channel).toBe('email');
    expect(result.current.email.maskedEmail).toBe('ar•••@piic.com.mx');
    expect(result.current.email.resendCooldown).toBe(60);
    expect(result.current.email.resendsLeft).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('start() sin info sigue siendo TOTP de 5 minutos, sin espera de reenvío', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));

    act(() => result.current.start('mfa-1'));

    expect(result.current.secondsRemaining).toBe(300);
    expect(result.current.email.channel).toBe('totp');
    expect(result.current.email.resendCooldown).toBe(0);
  });

  it('si el correo no salió, lo avisa desde el inicio', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));

    act(() => result.current.start('mfa-1', { ...EMAIL_INFO, codeSent: false }));

    expect(result.current.error).toMatch(/No pudimos enviar el correo/);
  });

  it('reenvío: usa el token actual, lo reemplaza por el nuevo y reinicia los 10 min', async () => {
    (resendEmailMfaCode as Mock).mockResolvedValue({
      token: 'mfa-2',
      maskedEmail: 'ar•••@piic.com.mx',
      codeSent: true,
      resendsLeft: 1,
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-1', EMAIL_INFO));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.secondsRemaining).toBe(595);

    act(() => result.current.handleResend());
    await flush();

    expect(resendEmailMfaCode).toHaveBeenCalledWith('mfa-1');
    expect(result.current.mfaToken).toBe('mfa-2');
    expect(result.current.secondsRemaining).toBe(600);
    expect(result.current.email.resendsLeft).toBe(1);
    expect(result.current.email.resendCooldown).toBe(60);
    expect(result.current.email.resending).toBe(false);
  });

  it('reenvío sin entrega: avisa', async () => {
    (resendEmailMfaCode as Mock).mockResolvedValue({
      token: 'mfa-2',
      maskedEmail: null,
      codeSent: false,
      resendsLeft: 0,
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-1', EMAIL_INFO));

    act(() => result.current.handleResend());
    await flush();

    expect(result.current.error).toMatch(/No pudimos enviar el correo/);
  });

  it('reenvío rechazado: muestra el mensaje del backend', async () => {
    (resendEmailMfaCode as Mock).mockRejectedValue({
      response: { data: { message: 'Espera un minuto antes de pedir otro código' } },
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-1', EMAIL_INFO));

    act(() => result.current.handleResend());
    await flush();

    expect(result.current.error).toBe('Espera un minuto antes de pedir otro código');
  });

  it('reenvío sin respuesta del servidor: mensaje de conexión', async () => {
    (resendEmailMfaCode as Mock).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-1', EMAIL_INFO));

    act(() => result.current.handleResend());
    await flush();

    expect(result.current.error).toMatch(/Error de conexión/);
  });

  it('sin reto activo, "reenviar" no hace nada', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));

    act(() => result.current.handleResend());

    expect(resendEmailMfaCode).not.toHaveBeenCalled();
  });
});
