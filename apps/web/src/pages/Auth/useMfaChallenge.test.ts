import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import useMfaChallenge from './useMfaChallenge';
import { verifyMfaChallenge } from '../../api/mfa';

/**
 * FC185 F4 — Frontend_Two_Step_Login_Challenge_Experience. El countdown es puramente visual (el
 * backend hace cumplir el TTL real vía JWT `exp`, F2) — se prueba con fake timers para no
 * depender de tiempo real en CI.
 */

vi.mock('../../api/mfa', () => ({
  verifyMfaChallenge: vi.fn(),
}));

const USER = { id: 501, username: 'grayman' } as never;

describe('useMfaChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('estado inicial: sin token, countdown en 5 minutos completos', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    expect(result.current.mfaToken).toBeNull();
    expect(result.current.secondsRemaining).toBe(300);
    expect(result.current.justExpired).toBe(false);
  });

  it('start() fija el token y reinicia code/error/backup/countdown', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));

    act(() => result.current.setCode('123'));
    act(() => result.current.toggleBackupCode());
    act(() => result.current.start('mfa-token-1'));

    expect(result.current.mfaToken).toBe('mfa-token-1');
    expect(result.current.code).toBe('');
    expect(result.current.useBackupCode).toBe(false);
    expect(result.current.justExpired).toBe(false);
    expect(result.current.secondsRemaining).toBe(300);
  });

  it('el countdown decrece cada segundo mientras hay un mfaToken activo', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));

    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.secondsRemaining).toBe(297);
  });

  it('el countdown NO corre sin un mfaToken activo', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.secondsRemaining).toBe(300);
  });

  it('llegar a 0 auto-expira: limpia el token y marca justExpired', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));

    act(() => vi.advanceTimersByTime(300_000));

    expect(result.current.mfaToken).toBeNull();
    expect(result.current.justExpired).toBe(true);
  });

  it('reset() manual limpia el token SIN marcar justExpired (a diferencia de la expiración)', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));

    act(() => result.current.reset());

    expect(result.current.mfaToken).toBeNull();
    expect(result.current.justExpired).toBe(false);
  });

  it('toggleBackupCode() alterna el modo', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    expect(result.current.useBackupCode).toBe(false);
    act(() => result.current.toggleBackupCode());
    expect(result.current.useBackupCode).toBe(true);
  });

  it('Scenario 2 — código válido: llama a onSuccess con token+user', async () => {
    (verifyMfaChallenge as Mock).mockResolvedValue({ token: 'session-token', user: USER });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useMfaChallenge(onSuccess));
    act(() => result.current.start('mfa-token-1'));
    act(() => result.current.setCode('123456'));

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as never);
      await vi.waitFor(() => expect(verifyMfaChallenge).toHaveBeenCalled());
    });

    expect(verifyMfaChallenge).toHaveBeenCalledWith('mfa-token-1', '123456');
    expect(onSuccess).toHaveBeenCalledWith('session-token', USER);
  });

  it('Scenario 3 — código inválido: muestra el mensaje del backend, NO limpia el token (puede reintentar)', async () => {
    (verifyMfaChallenge as Mock).mockRejectedValue({
      response: { data: { code: 'MFA_INVALID_CODE', message: 'El código ingresado no es válido' } },
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));
    act(() => result.current.setCode('000000'));

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as never);
      await vi.waitFor(() => expect(verifyMfaChallenge).toHaveBeenCalled());
    });

    expect(result.current.error).toBe('El código ingresado no es válido');
    expect(result.current.mfaToken).toBe('mfa-token-1');
  });

  it('sin `message` en la respuesta del backend, usa el mensaje de respaldo según el tipo de error', async () => {
    (verifyMfaChallenge as Mock).mockRejectedValueOnce({
      response: { data: { code: 'MFA_INVALID_CODE' } },
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as never);
      await vi.waitFor(() => expect(verifyMfaChallenge).toHaveBeenCalled());
    });

    expect(result.current.error).toBe('Error de conexión. Intenta de nuevo más tarde.');
  });

  it('Scenario 3 — reto revocado/expirado: limpia el token y marca justExpired en vez de mostrar error inline', async () => {
    (verifyMfaChallenge as Mock).mockRejectedValue({
      response: {
        data: { code: 'TOKEN_EXPIRED_OR_REVOKED', message: 'El reto expiró o fue revocado' },
      },
    });
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.start('mfa-token-1'));

    await act(async () => {
      result.current.handleSubmit({ preventDefault: vi.fn() } as never);
      await vi.waitFor(() => expect(verifyMfaChallenge).toHaveBeenCalled());
    });

    expect(result.current.mfaToken).toBeNull();
    expect(result.current.justExpired).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handleSubmit es un no-op si no hay mfaToken activo (guard defensivo)', () => {
    const { result } = renderHook(() => useMfaChallenge(vi.fn()));
    act(() => result.current.handleSubmit({ preventDefault: vi.fn() } as never));
    expect(verifyMfaChallenge).not.toHaveBeenCalled();
  });
});
