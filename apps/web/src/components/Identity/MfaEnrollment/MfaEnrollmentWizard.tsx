import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { beginMfaSetup, confirmMfaSetup, MfaSetupData } from '../../../api/mfa';
import MfaScanStep from './MfaScanStep';
import MfaBackupCodesStep from './MfaBackupCodesStep';

/**
 * FC185 F3 — Frontend_MFA_Enrolment_And_Security_Wizard. Orquesta setup → confirm → códigos de
 * respaldo. Reutilizable en dos contextos (Cond.8 TSDoc):
 *  - Voluntario: desde Configuración, con sesión real ya activa (`token` omitido — el interceptor
 *    de `api/client.ts` adjunta el access token real).
 *  - Obligatorio: Ω/MU sin enrolar, atrapados en `Login.tsx` antes de tener sesión (`token` = el
 *    `setupToken` de alcance mínimo que `/login` entrega en ese caso — invariante 4 del FC).
 */

/** Los datos de cada paso viajan DENTRO del paso (unión discriminada), no en `useState`s hermanos:
 *  el compilador garantiza que `scan` siempre trae `setupData` y `backup` siempre trae
 *  `backupCodes`, así que el render no necesita fallbacks defensivos (`?? ''`) para estados que el
 *  tipo ya hace imposibles. */
type WizardState =
  | { step: 'loading' }
  | { step: 'load-error' }
  | { step: 'scan'; setupData: MfaSetupData }
  | { step: 'backup'; backupCodes: string[] };

function getMfaErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ code?: string }>;
  if (axiosError.response?.status === 401) {
    return 'Código incorrecto. Verifica la hora de tu dispositivo e intenta de nuevo.';
  }
  return 'Error de conexión. Intenta de nuevo más tarde.';
}

interface MfaEnrollmentWizardProps {
  readonly token?: string;
  readonly onComplete: () => void;
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
      .catch(() => {
        if (!cancelled) setState({ step: 'load-error' });
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
function MfaLoadErrorBanner(): React.JSX.Element {
  return (
    <div
      className="p-4 bg-red-500/10 text-red-600 text-sm font-bold rounded-[4px] border-l-4 border-red-500"
      data-testid="mfa-load-error"
    >
      No se pudo iniciar el enrolamiento MFA. Recarga la página e intenta de nuevo.
    </div>
  );
}

/** Orquestador visual: loading → scan (QR + confirmación) → backup (códigos de respaldo). */
export default function MfaEnrollmentWizard({
  token,
  onComplete,
}: MfaEnrollmentWizardProps): React.JSX.Element {
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
    return <MfaLoadErrorBanner />;
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
