import React from 'react';

/**
 * FC195 F3 — botón "Reenviar código" del 2FA por correo (enrolamiento y login). Se deshabilita
 * durante la espera de 60 s, mientras envía y cuando ya no quedan reenvíos (3 envíos por reto).
 */

interface MfaEmailResendButtonProps {
  readonly secondsLeft: number;
  readonly resendsLeft: number;
  readonly sending: boolean;
  readonly onResend: () => void;
}

function resendLabel(secondsLeft: number, resendsLeft: number, sending: boolean): string {
  if (resendsLeft <= 0) return 'Ya no quedan reenvíos';
  if (sending) return 'Enviando...';
  if (secondsLeft > 0) return `Reenviar código en ${secondsLeft} s`;
  return `Reenviar código (${resendsLeft} restante${resendsLeft === 1 ? '' : 's'})`;
}

/** Botón de reenvío con su estado visible (espera, envío en curso o sin reenvíos). */
export default function MfaEmailResendButton({
  secondsLeft,
  resendsLeft,
  sending,
  onResend,
}: MfaEmailResendButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={sending || secondsLeft > 0 || resendsLeft <= 0}
      data-testid="mfa-email-resend"
      className="text-xs font-bold text-pinnacle-navy/60 hover:text-pinnacle-navy underline underline-offset-2 disabled:no-underline disabled:opacity-50"
    >
      {resendLabel(secondsLeft, resendsLeft, sending)}
    </button>
  );
}
