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

type WizardStep = 'loading' | 'scan' | 'backup' | 'load-error';

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
function useMfaSetupLoad(
  token: string | undefined,
  setSetupData: (d: MfaSetupData) => void,
  setStep: (s: WizardStep) => void
): void {
  useEffect(() => {
    let cancelled = false;
    beginMfaSetup(token)
      .then((data) => {
        if (cancelled) return;
        setSetupData(data);
        setStep('scan');
      })
      .catch(() => {
        if (!cancelled) setStep('load-error');
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
  step: WizardStep;
  setupData: MfaSetupData | null;
  code: string;
  setCode: (v: string) => void;
  confirming: boolean;
  confirmError: string | null;
  backupCodes: string[];
  handleConfirm: (e: React.FormEvent) => void;
  handleBackupDone: () => void;
} {
  const [step, setStep] = useState<WizardStep>('loading');
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useMfaSetupLoad(token, setSetupData, setStep);

  const handleConfirm = (e: React.FormEvent): void => {
    e.preventDefault();
    setConfirming(true);
    setConfirmError(null);
    confirmMfaSetup(code, token)
      .then((codes) => {
        setBackupCodes(codes);
        setStep('backup');
      })
      .catch((err: unknown) => setConfirmError(getMfaErrorMessage(err)))
      .finally(() => setConfirming(false));
  };

  const handleBackupDone = (): void => onComplete();

  return {
    step,
    setupData,
    code,
    setCode,
    confirming,
    confirmError,
    backupCodes,
    handleConfirm,
    handleBackupDone,
  };
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
  const {
    step,
    setupData,
    code,
    setCode,
    confirming,
    confirmError,
    backupCodes,
    handleConfirm,
    handleBackupDone,
  } = useMfaEnrollmentState(token, onComplete);

  if (step === 'loading') {
    return (
      <div data-testid="mfa-wizard-loading" className="text-center py-12 text-pinnacle-navy/50">
        Preparando tu enrolamiento...
      </div>
    );
  }
  if (step === 'load-error') {
    return <MfaLoadErrorBanner />;
  }
  if (step === 'backup') {
    return <MfaBackupCodesStep codes={backupCodes} onDone={handleBackupDone} />;
  }
  return (
    <MfaScanStep
      otpauthUri={setupData?.otpauthUri ?? ''}
      secretBase32={setupData?.secretBase32 ?? ''}
      code={code}
      onCodeChange={setCode}
      loading={confirming}
      error={confirmError}
      onSubmit={handleConfirm}
    />
  );
}
