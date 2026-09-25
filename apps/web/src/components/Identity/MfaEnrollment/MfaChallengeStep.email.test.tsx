import type React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MfaChallengeStep from './MfaChallengeStep';

/** FC195 F3 — el paso del reto de login en modo correo (código de 8 caracteres + reenvío). */

const RESEND = { secondsLeft: 0, resendsLeft: 2, sending: false, onResend: vi.fn() };

function renderEmailStep(overrides: Partial<React.ComponentProps<typeof MfaChallengeStep>> = {}): {
  onCodeChange: ReturnType<typeof vi.fn>;
} {
  const onCodeChange = vi.fn();
  render(
    <MfaChallengeStep
      code=""
      onCodeChange={onCodeChange}
      loading={false}
      error={null}
      onSubmit={vi.fn()}
      useBackupCode={false}
      onToggleBackupCode={vi.fn()}
      secondsRemaining={600}
      onBack={vi.fn()}
      channel="email"
      maskedEmail="ar•••@piic.com.mx"
      resend={RESEND}
      {...overrides}
    />
  );
  return { onCodeChange };
}

const codeInput = (): HTMLInputElement =>
  screen.getByTestId('mfa-challenge-step').querySelector('input') as HTMLInputElement;

describe('MfaChallengeStep — canal de correo (FC195 F3)', () => {
  it('dice a qué correo se envió, acepta 8 caracteres y normaliza lo tecleado', () => {
    const { onCodeChange } = renderEmailStep();

    expect(screen.getByText(/que enviamos a ar•••@piic\.com\.mx/)).toBeInTheDocument();
    expect(codeInput().maxLength).toBe(8);
    expect(codeInput().inputMode).toBe('text');
    fireEvent.change(codeInput(), { target: { value: 'abcd efgh' } });
    expect(onCodeChange).toHaveBeenCalledWith('ABCDEFGH');
  });

  it('sin correo conocido, lo dice de forma genérica', () => {
    renderEmailStep({ maskedEmail: null });

    expect(screen.getByText(/que enviamos a tu correo/)).toBeInTheDocument();
  });

  it('muestra el reenvío y el enlace de respaldo', () => {
    renderEmailStep();

    expect(screen.getByTestId('mfa-email-resend')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge-toggle-backup')).toHaveTextContent(
      'Usar código de respaldo de emergencia'
    );
  });

  it('con código de respaldo: oculta el reenvío y ofrece volver al código del correo', () => {
    renderEmailStep({ useBackupCode: true });

    expect(screen.queryByTestId('mfa-email-resend')).not.toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge-toggle-backup')).toHaveTextContent(
      'Usar código del correo'
    );
    expect(codeInput().maxLength).toBe(11);
  });

  it('en TOTP nunca hay botón de reenvío aunque llegue la prop', () => {
    renderEmailStep({ channel: 'totp' });

    expect(screen.queryByTestId('mfa-email-resend')).not.toBeInTheDocument();
    expect(codeInput().maxLength).toBe(6);
  });
});
