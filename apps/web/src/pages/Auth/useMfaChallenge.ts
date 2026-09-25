import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { AxiosError } from 'axios';
import { verifyMfaChallenge } from '../../api/mfa';
import { UserIndustrial } from '../../types/user';
import useEmailChallenge, {
  CHALLENGE_TTL_SECONDS,
  ChallengeInfo,
  EmailChallenge,
} from './useEmailChallenge';

/**
 * FC185 F4 — Frontend_Two_Step_Login_Challenge_Experience. Extraído de `Login.tsx` (propio
 * archivo, mismo patrón que `ArchonProfilePanel/useProfileSubmit.ts`) porque `useLoginForm` ya
 * estaba en el límite de 50 líneas de Gate 2 antes de agregar todo el estado del desafío.
 */

export interface MfaChallengeState {
  mfaToken: string | null;
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  error: string | null;
  justExpired: boolean;
  useBackupCode: boolean;
  toggleBackupCode: () => void;
  secondsRemaining: number;
  /** FC195 — `info` trae el canal (`totp`/`email`) y, si es correo, a dónde se envió. */
  start: (token: string, info?: ChallengeInfo) => void;
  reset: () => void;
  handleSubmit: (e: FormEvent) => void;
  /** FC195 F3 — canal del reto y reenvío del código por correo. */
  email: EmailChallenge;
  handleResend: () => void;
}

/** El backend ya entrega `message` en español (F2) — se usa directo salvo fallback defensivo. */
function getMfaChallengeErrorMessage(err: unknown): { message: string; expired: boolean } {
  const axiosError = err as AxiosError<{ code?: string; message?: string }>;
  const expired = axiosError.response?.data?.code === 'TOKEN_EXPIRED_OR_REVOKED';
  const fallback = expired
    ? 'El reto de verificación expiró. Inicia sesión de nuevo.'
    : 'Error de conexión. Intenta de nuevo más tarde.';
  return { message: axiosError.response?.data?.message ?? fallback, expired };
}

/** Countdown puramente visual (UX) — el TTL real (5 min TOTP, 10 min correo) lo hace cumplir el
 *  backend vía `exp` del JWT; llegar a 0 aquí solo evita dejar al usuario tecleando un token ya
 *  muerto. */
function useMfaChallengeCountdown(
  active: boolean,
  onExpire: () => void
): { secondsRemaining: number; resetTimer: (seconds: number) => void } {
  const [secondsRemaining, setSecondsRemaining] = useState(CHALLENGE_TTL_SECONDS.totp);

  useEffect(() => {
    if (!active) return undefined;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return (): void => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (active && secondsRemaining === 0) onExpire();
  }, [active, secondsRemaining, onExpire]);

  return { secondsRemaining, resetTimer: setSecondsRemaining };
}

interface SubmitMfaChallengeHandlers {
  readonly onSuccess: (token: string, user: UserIndustrial) => void;
  readonly setLoading: (v: boolean) => void;
  readonly setError: (v: string | null) => void;
  readonly expire: () => void;
}

/** El envío del código: canjea `mfaToken`+`code` por sesión completa — extraído de
 *  `useMfaChallenge` para mantenerlo bajo Gate 2, mismo comportamiento verbatim. */
function submitMfaChallenge(
  mfaToken: string,
  code: string,
  handlers: SubmitMfaChallengeHandlers
): void {
  handlers.setLoading(true);
  handlers.setError(null);
  verifyMfaChallenge(mfaToken, code)
    .then((result) => handlers.onSuccess(result.token, result.user))
    .catch((err: unknown) => {
      const { message, expired } = getMfaChallengeErrorMessage(err);
      if (expired) {
        handlers.expire();
      } else {
        handlers.setError(message);
      }
    })
    .finally(() => handlers.setLoading(false));
}

/** Estado base del reto (token vigente, código, error, respaldo) y sus dos salidas: manual (`reset`)
 *  o por expiración (`expire`). Extraído de `useMfaChallenge` (Gate 2, FC195), mismo comportamiento. */
function useChallengeCore(): {
  mfaToken: string | null;
  setMfaToken: (v: string | null) => void;
  mfaTokenRef: React.MutableRefObject<string | null>;
  code: string;
  setCode: (v: string) => void;
  error: string | null;
  setError: (v: string | null) => void;
  justExpired: boolean;
  setJustExpired: (v: boolean) => void;
  useBackupCode: boolean;
  setUseBackupCode: React.Dispatch<React.SetStateAction<boolean>>;
  reset: () => void;
  expire: () => void;
} {
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justExpired, setJustExpired] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const mfaTokenRef = useRef<string | null>(null);
  mfaTokenRef.current = mfaToken;

  const reset = useCallback((): void => {
    setMfaToken(null);
    setCode('');
    setError(null);
    setUseBackupCode(false);
  }, []);

  const expire = useCallback((): void => {
    reset();
    setJustExpired(true);
  }, [reset]);

  return {
    mfaToken,
    setMfaToken,
    mfaTokenRef,
    code,
    setCode,
    error,
    setError,
    justExpired,
    setJustExpired,
    useBackupCode,
    setUseBackupCode,
    reset,
    expire,
  };
}

/** Estado del desafío de login (`mfaRequired: true`, F4) — código TOTP o de respaldo, countdown,
 *  y salida (manual o por expiración) de vuelta al paso 1. */
export default function useMfaChallenge(
  onSuccess: (token: string, user: UserIndustrial) => void
): MfaChallengeState {
  const core = useChallengeCore();
  const { mfaToken, setMfaToken, mfaTokenRef, code, setCode, error, setError } = core;
  const { justExpired, setJustExpired, useBackupCode, setUseBackupCode, reset, expire } = core;
  const [loading, setLoading] = useState(false);

  const { secondsRemaining, resetTimer } = useMfaChallengeCountdown(mfaToken !== null, expire);
  const email = useEmailChallenge({
    replaceToken: setMfaToken,
    restartTimer: resetTimer,
    setError,
  });

  const start = (token: string, info?: ChallengeInfo): void => {
    setJustExpired(false);
    setMfaToken(token);
    setCode('');
    setUseBackupCode(false);
    setError(email.begin(info));
    resetTimer(CHALLENGE_TTL_SECONDS[info?.channel ?? 'totp']);
  };

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!mfaTokenRef.current) return;
    submitMfaChallenge(mfaTokenRef.current, code, { onSuccess, setLoading, setError, expire });
  };

  return {
    mfaToken,
    code,
    setCode,
    loading,
    error,
    justExpired,
    useBackupCode,
    toggleBackupCode: (): void => setUseBackupCode((v) => !v),
    secondsRemaining,
    start,
    reset,
    handleSubmit,
    email,
    handleResend: (): void => {
      if (mfaTokenRef.current) email.resend(mfaTokenRef.current);
    },
  };
}
