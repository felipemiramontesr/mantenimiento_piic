import React, { useEffect, useState } from 'react';
import { beginEmailMfaSetup, confirmEmailMfaSetup, resendEmailMfaCode } from '../../../api/mfa';
import { apiErrorMessage, useResendCooldown } from './emailMfaShared';

/**
 * FC195 F3 — estado del enrolamiento por correo: envío inicial → captura del código → códigos de
 * respaldo. El `emailSetupToken` ata la confirmación al reto; cada reenvío lo reemplaza por uno
 * nuevo (mismo reto, 10 min más), así que se guarda en el estado del paso.
 */

const CONNECTION_ERROR = 'Error de conexión. Intenta de nuevo más tarde.';
/** 1 envío inicial + 2 reenvíos (lo impone el backend). */
const INITIAL_RESENDS = 2;

/** Paso de captura: el token vigente del reto y a dónde se envió el código. */
export interface EmailCodeStep {
  step: 'code';
  setupToken: string;
  maskedEmail: string;
}

export type EmailEnrollmentState =
  | { step: 'sending' }
  | { step: 'start-error'; message: string }
  | EmailCodeStep
  | { step: 'backup'; backupCodes: string[] };

export interface EmailEnrollment {
  state: EmailEnrollmentState;
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  error: string | null;
  resendsLeft: number;
  cooldown: number;
  /** Solo existen en el paso de captura: reciben ese paso (no hay rama "fuera de paso"). */
  handleSubmit: (e: React.FormEvent, current: EmailCodeStep) => void;
  handleResend: (current: EmailCodeStep) => void;
}

/** Envío inicial al montar; el guard `cancelled` evita tocar estado tras desmontar. */
function useInitialSend(
  token: string | undefined,
  setState: (s: EmailEnrollmentState) => void,
  startCooldown: () => void
): void {
  useEffect(() => {
    let cancelled = false;
    beginEmailMfaSetup(token)
      .then((data) => {
        if (cancelled) return;
        setState({ step: 'code', setupToken: data.emailSetupToken, maskedEmail: data.maskedEmail });
        startCooldown();
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ step: 'start-error', message: apiErrorMessage(err, CONNECTION_ERROR) });
      });
    return (): void => {
      cancelled = true;
    };
  }, []);
}

interface EnrollmentSetters {
  readonly setState: (s: EmailEnrollmentState) => void;
  readonly setBusy: (v: boolean) => void;
  readonly setError: (v: string | null) => void;
}

const NOT_SENT = 'No pudimos enviar el correo. Intenta reenviar el código en un minuto.';

/** Confirma el código; el éxito lleva a los códigos de respaldo. */
function submitCode(
  setupToken: string,
  code: string,
  token: string | undefined,
  s: EnrollmentSetters
): void {
  s.setBusy(true);
  s.setError(null);
  confirmEmailMfaSetup(setupToken, code, token)
    .then((backupCodes) => s.setState({ step: 'backup', backupCodes }))
    .catch((err: unknown) => s.setError(apiErrorMessage(err, CONNECTION_ERROR)))
    .finally(() => s.setBusy(false));
}

interface ResendSetters extends EnrollmentSetters {
  readonly setResendsLeft: (v: number) => void;
  readonly setCode: (v: string) => void;
  readonly startCooldown: () => void;
}

/** Pide un código nuevo; el token del reto se reemplaza por el que responde el backend. */
function resendCode(current: EmailCodeStep, s: ResendSetters): void {
  s.setBusy(true);
  s.setError(null);
  resendEmailMfaCode(current.setupToken)
    .then((data) => {
      s.setState({ step: 'code', setupToken: data.token, maskedEmail: current.maskedEmail });
      s.setResendsLeft(data.resendsLeft);
      s.setCode('');
      s.startCooldown();
      if (!data.codeSent) s.setError(NOT_SENT);
    })
    .catch((err: unknown) => s.setError(apiErrorMessage(err, CONNECTION_ERROR)))
    .finally(() => s.setBusy(false));
}

/** Estado + llamadas a la API del enrolamiento por correo. */
export default function useEmailEnrollment(token: string | undefined): EmailEnrollment {
  const [state, setState] = useState<EmailEnrollmentState>({ step: 'sending' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendsLeft, setResendsLeft] = useState(INITIAL_RESENDS);
  const { secondsLeft, startCooldown } = useResendCooldown();
  const setters = { setState, setBusy, setError };

  useInitialSend(token, setState, startCooldown);

  const handleSubmit = (e: React.FormEvent, current: EmailCodeStep): void => {
    e.preventDefault();
    submitCode(current.setupToken, code, token, setters);
  };

  const handleResend = (current: EmailCodeStep): void =>
    resendCode(current, { ...setters, setResendsLeft, setCode, startCooldown });

  return {
    state,
    code,
    setCode,
    busy,
    error,
    resendsLeft,
    cooldown: secondsLeft,
    handleSubmit,
    handleResend,
  };
}
