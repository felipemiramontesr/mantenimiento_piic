import React from 'react';
import MfaBackupCodesStep from './MfaBackupCodesStep';
import MfaEmailResendButton from './MfaEmailResendButton';
import useEmailEnrollment, { EmailCodeStep, EmailEnrollment } from './useEmailEnrollment';
import { EMAIL_CODE_LENGTH, normalizeEmailCodeInput } from './emailMfaShared';

/**
 * FC195 F3 — enrolamiento del 2FA por correo (solo Arc): enviamos un código de 8 caracteres al
 * correo registrado, el usuario lo captura y recibe sus 8 códigos de respaldo. Confirmar el código
 * también deja el correo marcado como verificado (lo hace el backend).
 */

const FIELD_LABEL_CLASS =
  'font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70';

interface MfaEmailEnrollmentProps {
  readonly token?: string;
  readonly onComplete: () => void;
  readonly onBack: () => void;
}

function ErrorBanner({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <div
      data-testid="mfa-email-error"
      className="p-3 bg-red-500/10 text-red-600 text-sm font-bold rounded-[4px] border-l-4 border-red-500"
    >
      {message}
    </div>
  );
}

interface EmailCodeFieldProps {
  readonly code: string;
  readonly setCode: (v: string) => void;
  readonly busy: boolean;
}

/** Input del código de 8 caracteres (normaliza mayúsculas y caracteres fuera del alfabeto). */
function EmailCodeField({ code, setCode, busy }: EmailCodeFieldProps): React.JSX.Element {
  return (
    <div>
      <label htmlFor="mfa-email-code" className={FIELD_LABEL_CLASS}>
        Código del correo
      </label>
      <input
        id="mfa-email-code"
        type="text"
        autoComplete="one-time-code"
        maxLength={EMAIL_CODE_LENGTH}
        value={code}
        onChange={(e): void => setCode(normalizeEmailCodeInput(e.target.value))}
        className="w-full h-14 mt-1 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-2xl tracking-[0.4em] text-center font-bold font-mono text-pinnacle-navy outline-none focus:border-pinnacle-yellow rounded-[4px]"
        disabled={busy}
        required
      />
    </div>
  );
}

interface EmailCodeFooterProps {
  readonly current: EmailCodeStep;
  readonly enrollment: EmailEnrollment;
  readonly onBack: () => void;
}

/** Reenvío + salida a la app autenticadora. */
function EmailCodeFooter({ current, enrollment, onBack }: EmailCodeFooterProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <MfaEmailResendButton
        secondsLeft={enrollment.cooldown}
        resendsLeft={enrollment.resendsLeft}
        sending={enrollment.busy}
        onResend={(): void => enrollment.handleResend(current)}
      />
      <button
        type="button"
        onClick={onBack}
        data-testid="mfa-email-back"
        className="text-xs font-bold text-pinnacle-navy/50 hover:opacity-80"
      >
        Usar la app
      </button>
    </div>
  );
}

interface EmailCodeFormProps {
  readonly current: EmailCodeStep;
  readonly enrollment: EmailEnrollment;
  readonly onBack: () => void;
}

/** Captura del código de 8 caracteres + reenvío. */
function EmailCodeForm({ current, enrollment, onBack }: EmailCodeFormProps): React.JSX.Element {
  const { code, setCode, busy, error, handleSubmit } = enrollment;
  return (
    <form
      onSubmit={(e): void => handleSubmit(e, current)}
      className="space-y-6"
      data-testid="mfa-email-code-step"
    >
      <div>
        <h3 className="text-pinnacle-navy font-display font-black text-2xl tracking-tight">
          Revisa tu correo
        </h3>
        <p className="text-pinnacle-navy/60 text-sm mt-1">
          Enviamos un código de 8 caracteres a <strong>{current.maskedEmail}</strong>. Caduca en 10
          minutos.
        </p>
      </div>
      {error && <ErrorBanner message={error} />}
      <EmailCodeField code={code} setCode={setCode} busy={busy} />
      <button
        type="submit"
        disabled={busy || code.length !== EMAIL_CODE_LENGTH}
        data-testid="mfa-email-confirm"
        className="btn-archon-primary w-full"
      >
        {busy ? 'Verificando...' : 'Activar verificación por correo'}
      </button>
      <EmailCodeFooter current={current} enrollment={enrollment} onBack={onBack} />
    </form>
  );
}

/** Orquestador: enviando → código → códigos de respaldo (o error de envío con salida a la app). */
export default function MfaEmailEnrollment({
  token,
  onComplete,
  onBack,
}: MfaEmailEnrollmentProps): React.JSX.Element {
  const enrollment = useEmailEnrollment(token);
  const { state } = enrollment;

  if (state.step === 'sending') {
    return (
      <div data-testid="mfa-email-sending" className="text-center py-12 text-pinnacle-navy/50">
        Enviando el código a tu correo...
      </div>
    );
  }
  if (state.step === 'start-error') {
    return (
      <div className="space-y-4" data-testid="mfa-email-start-error">
        <ErrorBanner message={state.message} />
        <button type="button" onClick={onBack} className="btn-archon-primary w-full">
          Usar la app autenticadora
        </button>
      </div>
    );
  }
  if (state.step === 'backup') {
    return <MfaBackupCodesStep codes={state.backupCodes} onDone={onComplete} />;
  }
  return <EmailCodeForm current={state} enrollment={enrollment} onBack={onBack} />;
}
