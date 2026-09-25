import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { beginMfaSetup, confirmMfaSetup, MfaSetupData, MfaMethod } from '../../../api/mfa';
import MfaScanStep from './MfaScanStep';
import MfaBackupCodesStep from './MfaBackupCodesStep';
import MfaMethodChoiceStep from './MfaMethodChoiceStep';
import MfaEmailEnrollment from './MfaEmailEnrollment';

/**
 * FC185 F3 — Frontend_MFA_Enrolment_And_Security_Wizard. Orquesta setup → confirm → códigos de
 * respaldo. Reutilizable en dos contextos (Cond.8 TSDoc):
 *  - Voluntario: desde Configuración, con sesión real ya activa (`token` omitido — el interceptor
 *    de `api/client.ts` adjunta el access token real).
 *  - Obligatorio: Ω/MU sin enrolar, atrapados en `Login.tsx` antes de tener sesión (`token` = el
 *    `setupToken` de alcance mínimo que `/login` entrega en ese caso — invariante 4 del FC).
 * FC195 F3 — `allowedMethods` (lo entrega `/login` con `mfaSetupRequired`): con más de un método
 * (Arc) primero se elige TOTP o correo; con solo `totp` (Ω/MU, o el flujo voluntario sin la lista)
 * entra directo a TOTP, como en FC185.
 */

/** Los datos de cada paso viajan DENTRO del paso (unión discriminada), no en `useState`s hermanos:
 *  el compilador garantiza que `scan` siempre trae `setupData` y `backup` siempre trae
 *  `backupCodes`, así que el render no necesita fallbacks defensivos (`?? ''`) para estados que el
 *  tipo ya hace imposibles. */
type WizardState =
  | { step: 'loading' }
  | { step: 'load-error'; message: string }
  | { step: 'scan'; setupData: MfaSetupData }
  | { step: 'backup'; backupCodes: string[] };

function getMfaErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ code?: string }>;
  if (axiosError.response?.status === 401) {
    return 'Código incorrecto. Verifica la hora de tu dispositivo e intenta de nuevo.';
  }
  return 'Error de conexión. Intenta de nuevo más tarde.';
}

/** FC195 — `/mfa/setup` responde 409 si la app ya está configurada (ya no la reemplaza). */
function getLoadErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ code?: string }>;
  if (axiosError.response?.status === 409) {
    return 'Ya tienes la verificación en dos pasos activa con tu app. Si la perdiste, pide a GrayMan que la restablezca.';
  }
  return 'No se pudo iniciar el enrolamiento MFA. Recarga la página e intenta de nuevo.';
}

interface MfaEnrollmentWizardProps {
  readonly token?: string;
  readonly onComplete: () => void;
  readonly allowedMethods?: readonly MfaMethod[];
}

/** Carga inicial (`/mfa/setup`) — extraída de `useMfaEnrollmentState` para mantenerlo bajo Gate 2.
 *  El guard `cancelled` cubre ambas ramas (éxito y error): un desmontaje durante la carga nunca
 *  actualiza estado de un componente ya fuera del árbol. */
function useMfaSetupLoad(token: string | undefined, setState: (s: WizardState) => void): void {
  useEffect(() => {
    let cancelled = false;
    beginMfaSetup(token)
      .then((data) => {
        if (!cancelled) setState({ step: 'scan', setupData: data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ step: 'load-error', message: getLoadErrorMessage(err) });
      });
    return (): void => {
      cancelled = true;
    };
  }, []);
}

/** Estado + llamadas a la API — extraído de `MfaEnrollmentWizard` para mantenerlo bajo Gate 2. */
function useMfaEnrollmentState(
  token: string | undefined,
  onComplete: () => void
): {
  state: WizardState;
  code: string;
  setCode: (v: string) => void;
  confirming: boolean;
  confirmError: string | null;
  handleConfirm: (e: React.FormEvent) => void;
  handleBackupDone: () => void;
} {
  const [state, setState] = useState<WizardState>({ step: 'loading' });
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useMfaSetupLoad(token, setState);

  const handleConfirm = (e: React.FormEvent): void => {
    e.preventDefault();
    setConfirming(true);
    setConfirmError(null);
    confirmMfaSetup(code, token)
      .then((backupCodes) => setState({ step: 'backup', backupCodes }))
      .catch((err: unknown) => setConfirmError(getMfaErrorMessage(err)))
      .finally(() => setConfirming(false));
  };

  const handleBackupDone = (): void => onComplete();

  return { state, code, setCode, confirming, confirmError, handleConfirm, handleBackupDone };
}

/** Banner de error de carga inicial (`/mfa/setup` falló) — sin reintentar automáticamente. */
function MfaLoadErrorBanner({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <div
      className="p-4 bg-red-500/10 text-red-600 text-sm font-bold rounded-[4px] border-l-4 border-red-500"
      data-testid="mfa-load-error"
    >
      {message}
    </div>
  );
}

interface TotpEnrollmentFlowProps {
  readonly token?: string;
  readonly onComplete: () => void;
}

/** Flujo TOTP (FC185): loading → scan (QR + confirmación) → backup (códigos de respaldo). */
function TotpEnrollmentFlow({ token, onComplete }: TotpEnrollmentFlowProps): React.JSX.Element {
  const { state, code, setCode, confirming, confirmError, handleConfirm, handleBackupDone } =
    useMfaEnrollmentState(token, onComplete);

  if (state.step === 'loading') {
    return (
      <div data-testid="mfa-wizard-loading" className="text-center py-12 text-pinnacle-navy/50">
        Preparando tu enrolamiento...
      </div>
    );
  }
  if (state.step === 'load-error') {
    return <MfaLoadErrorBanner message={state.message} />;
  }
  if (state.step === 'backup') {
    return <MfaBackupCodesStep codes={state.backupCodes} onDone={handleBackupDone} />;
  }
  return (
    <MfaScanStep
      otpauthUri={state.setupData.otpauthUri}
      secretBase32={state.setupData.secretBase32}
      code={code}
      onCodeChange={setCode}
      loading={confirming}
      error={confirmError}
      onSubmit={handleConfirm}
    />
  );
}

/** Orquestador: elige método si hay más de uno (Arc) y delega al flujo TOTP o al de correo. */
export default function MfaEnrollmentWizard({
  token,
  onComplete,
  allowedMethods = ['totp'],
}: MfaEnrollmentWizardProps): React.JSX.Element {
  const [method, setMethod] = useState<MfaMethod | null>(
    allowedMethods.includes('email') ? null : 'totp'
  );

  if (method === null) return <MfaMethodChoiceStep onChoose={setMethod} />;
  if (method === 'email') {
    return (
      <MfaEmailEnrollment
        token={token}
        onComplete={onComplete}
        onBack={(): void => setMethod('totp')}
      />
    );
  }
  return <TotpEnrollmentFlow token={token} onComplete={onComplete} />;
}
