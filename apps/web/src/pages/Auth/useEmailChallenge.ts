import { useState } from 'react';
import { MfaMethod, resendEmailMfaCode } from '../../api/mfa';
import {
  apiErrorMessage,
  useResendCooldown,
} from '../../components/Identity/MfaEnrollment/emailMfaShared';

/**
 * FC195 F3 — la parte del reto de login que solo existe con 2FA por correo: a qué correo se envió,
 * cuántos reenvíos quedan y la espera entre ellos. Extraído de `useMfaChallenge` (Gate 2). El
 * reenvío responde un `mfaToken` NUEVO del mismo reto (10 min más), que reemplaza al anterior.
 */

/** Vida del reto que el backend firma en el `mfaToken`, por canal (TOTP 5 min, correo 10 min). */
export const CHALLENGE_TTL_SECONDS: Readonly<Record<MfaMethod, number>> = {
  totp: 5 * 60,
  email: 10 * 60,
};

const INITIAL_RESENDS = 2;
const NOT_SENT = 'No pudimos enviar el correo. Pide que te lo reenviemos en un minuto.';
const CONNECTION_ERROR = 'Error de conexión. Intenta de nuevo más tarde.';

/** Datos del reto que `/login` entrega junto con el `mfaToken`. */
export interface ChallengeInfo {
  readonly channel?: MfaMethod;
  readonly maskedEmail?: string | null;
  readonly codeSent?: boolean;
}

export interface EmailChallenge {
  channel: MfaMethod;
  maskedEmail: string | null;
  resendsLeft: number;
  resendCooldown: number;
  resending: boolean;
  /** Arranca el estado del canal; regresa el aviso a mostrar si el correo no salió. */
  begin: (info: ChallengeInfo | undefined) => string | null;
  resend: (mfaToken: string) => void;
}

interface EmailChallengeDeps {
  readonly replaceToken: (token: string) => void;
  readonly restartTimer: (seconds: number) => void;
  readonly setError: (v: string | null) => void;
}

/** Estado del canal de correo del reto de login y su reenvío. */
export default function useEmailChallenge(deps: EmailChallengeDeps): EmailChallenge {
  const [channel, setChannel] = useState<MfaMethod>('totp');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [resendsLeft, setResendsLeft] = useState(INITIAL_RESENDS);
  const [resending, setResending] = useState(false);
  const { secondsLeft, startCooldown } = useResendCooldown();

  const begin = (info: ChallengeInfo | undefined): string | null => {
    const nextChannel = info?.channel ?? 'totp';
    setChannel(nextChannel);
    setMaskedEmail(info?.maskedEmail ?? null);
    setResendsLeft(INITIAL_RESENDS);
    if (nextChannel !== 'email') return null;
    startCooldown();
    return info?.codeSent === false ? NOT_SENT : null;
  };

  const resend = (mfaToken: string): void => {
    setResending(true);
    deps.setError(null);
    resendEmailMfaCode(mfaToken)
      .then((data) => {
        deps.replaceToken(data.token);
        deps.restartTimer(CHALLENGE_TTL_SECONDS.email);
        setResendsLeft(data.resendsLeft);
        startCooldown();
        if (!data.codeSent) deps.setError(NOT_SENT);
      })
      .catch((err: unknown) => deps.setError(apiErrorMessage(err, CONNECTION_ERROR)))
      .finally(() => setResending(false));
  };

  return {
    channel,
    maskedEmail,
    resendsLeft,
    resendCooldown: secondsLeft,
    resending,
    begin,
    resend,
  };
}
