import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  normalizeEmailCodeInput,
  apiErrorMessage,
  useResendCooldown,
  RESEND_COOLDOWN_SECONDS,
} from './emailMfaShared';
import MfaEmailResendButton from './MfaEmailResendButton';
import MfaMethodChoiceStep from './MfaMethodChoiceStep';

/** FC195 F3 — piezas compartidas del 2FA por correo. */

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeEmailCodeInput', () => {
  it.each([
    ['abcd efgh', 'ABCDEFGH'],
    ['ab-cd-ef-gh', 'ABCDEFGH'],
    ['ABCDEFGHJK', 'ABCDEFGH'],
    ['o0i1LZ', 'LZ'],
  ])('%s → %s', (raw, normalized) => {
    expect(normalizeEmailCodeInput(raw)).toBe(normalized);
  });
});

describe('apiErrorMessage', () => {
  it('usa el mensaje del backend y, sin él, el texto de respaldo', () => {
    expect(apiErrorMessage({ response: { data: { message: 'del server' } } }, 'fb')).toBe(
      'del server'
    );
    expect(apiErrorMessage(new Error('red'), 'fb')).toBe('fb');
  });
});

describe('useResendCooldown', () => {
  it('arranca en 60 y baja cada segundo hasta 0', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useResendCooldown());
    expect(result.current.secondsLeft).toBe(0);

    act(() => result.current.startCooldown());
    expect(result.current.secondsLeft).toBe(RESEND_COOLDOWN_SECONDS);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(RESEND_COOLDOWN_SECONDS - 1);

    for (let i = 0; i < RESEND_COOLDOWN_SECONDS; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(result.current.secondsLeft).toBe(0);
  });
});

describe('MfaEmailResendButton', () => {
  const base = { secondsLeft: 0, resendsLeft: 2, sending: false, onResend: vi.fn() };

  it('listo: muestra los reenvíos restantes y llama a onResend', () => {
    const onResend = vi.fn();
    render(<MfaEmailResendButton {...base} onResend={onResend} />);

    const button = screen.getByTestId('mfa-email-resend');
    expect(button).toHaveTextContent('Reenviar código (2 restantes)');
    fireEvent.click(button);
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ resendsLeft: 1 }, 'Reenviar código (1 restante)', false],
    [{ secondsLeft: 42 }, 'Reenviar código en 42 s', true],
    [{ sending: true }, 'Enviando...', true],
    [{ resendsLeft: 0 }, 'Ya no quedan reenvíos', true],
  ])('%o → "%s"', (overrides, label, disabled) => {
    render(<MfaEmailResendButton {...base} {...overrides} />);

    const button = screen.getByTestId('mfa-email-resend');
    expect(button).toHaveTextContent(label);
    expect((button as HTMLButtonElement).disabled).toBe(disabled);
  });
});

describe('MfaMethodChoiceStep', () => {
  it.each([['totp'], ['email']])('elegir %s llama a onChoose con ese método', (method) => {
    const onChoose = vi.fn();
    render(<MfaMethodChoiceStep onChoose={onChoose} />);

    fireEvent.click(screen.getByTestId(`mfa-method-${method}`));

    expect(onChoose).toHaveBeenCalledWith(method);
  });
});
