import React, { useEffect, useRef } from 'react';

/**
 * FC185 F4 — Frontend_Two_Step_Login_Challenge_Experience. Pantalla de desafío para un usuario
 * que YA tiene MFA confirmado (`mfaRequired: true` en `/login`, distinto de `mfaSetupRequired` de
 * F3). Un solo input de texto cubre tanto el código TOTP (6 dígitos) como el de respaldo
 * (`XXXXX-XXXXX`) — el backend ya distingue el formato (F2), así que no hace falta duplicar la
 * llamada; el toggle solo cambia `maxLength`/texto guía/filtrado local. Auto-focus y pegado
 * (`paste`) funcionan de fábrica en un `<input>` nativo — no se necesitan N cajas de 1 dígito para
 * cumplir "auto-focus, paste automático, navegación por teclado".
 */

function formatCountdown(secondsRemaining: number): string {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface MfaChallengeCountdownProps {
  readonly secondsRemaining: number;
}

/** Countdown visual — refleja el TTL real de 5 min del `mfaToken` (el backend ya lo hace cumplir;
 *  esto es UX, no la frontera de seguridad). Extraído para mantener el paso bajo Gate 2. */
function MfaChallengeCountdown({
  secondsRemaining,
}: MfaChallengeCountdownProps): React.JSX.Element {
  const isLow = secondsRemaining <= 30;
  return (
    <p
      data-testid="mfa-challenge-countdown"
      className={`text-center text-xs font-bold ${
        isLow ? 'text-red-600' : 'text-pinnacle-navy/50'
      }`}
    >
      Este código expira en {formatCountdown(secondsRemaining)}
    </p>
  );
}

interface MfaChallengeInputFieldsProps {
  readonly code: string;
  readonly useBackupCode: boolean;
  readonly loading: boolean;
  readonly onChange: (raw: string) => void;
  readonly inputRef: React.RefObject<HTMLInputElement>;
}

/** Input (TOTP o backup) + botón de submit — extraído para mantener `MfaChallengeStep` bajo Gate 2. */
function MfaChallengeInputFields({
  code,
  useBackupCode,
  loading,
  onChange,
  inputRef,
}: MfaChallengeInputFieldsProps): React.JSX.Element {
  return (
    <>
      <input
        ref={inputRef}
        id="mfa-challenge-code"
        type="text"
        inputMode={useBackupCode ? 'text' : 'numeric'}
        maxLength={useBackupCode ? 11 : 6}
        autoComplete="one-time-code"
        value={code}
        onChange={(e): void => onChange(e.target.value)}
        className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-2xl tracking-[0.3em] text-center font-bold text-pinnacle-navy outline-none focus:border-pinnacle-yellow rounded-[4px]"
        disabled={loading}
        required
      />

      <button
        type="submit"
        disabled={loading || code.length === 0}
        data-testid="mfa-challenge-submit"
        className="btn-archon-primary w-full"
      >
        {loading ? 'Verificando...' : 'Verificar'}
      </button>
    </>
  );
}

interface MfaChallengeFooterLinksProps {
  readonly useBackupCode: boolean;
  readonly onToggleBackupCode: () => void;
  readonly onBack: () => void;
}

/** Links de "usar código de respaldo" / "volver" — extraído para mantener `MfaChallengeStep` bajo
 *  Gate 2. */
function MfaChallengeFooterLinks({
  useBackupCode,
  onToggleBackupCode,
  onBack,
}: MfaChallengeFooterLinksProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs">
      <button
        type="button"
        onClick={onToggleBackupCode}
        data-testid="mfa-challenge-toggle-backup"
        className="text-pinnacle-yellow font-bold hover:opacity-80"
      >
        {useBackupCode ? 'Usar código de la app' : 'Usar código de respaldo de emergencia'}
      </button>
      <button
        type="button"
        onClick={onBack}
        data-testid="mfa-challenge-back"
        className="text-pinnacle-navy/50 font-bold hover:opacity-80"
      >
        Volver
      </button>
    </div>
  );
}

interface MfaChallengeHeaderProps {
  readonly useBackupCode: boolean;
  readonly error: string | null;
}

/** Título + instrucción + banner de error — extraído para mantener `MfaChallengeStep` bajo Gate 2. */
function MfaChallengeHeader({ useBackupCode, error }: MfaChallengeHeaderProps): React.JSX.Element {
  return (
    <>
      <div>
        <h2 className="text-pinnacle-navy font-display font-black text-3xl tracking-tight">
          Verificación en dos pasos
        </h2>
        <p className="text-pinnacle-navy/60 text-sm mt-1">
          {useBackupCode
            ? 'Ingresa uno de tus códigos de respaldo.'
            : 'Ingresa el código de tu app autenticadora.'}
        </p>
      </div>

      {error && (
        <div
          data-testid="mfa-challenge-error"
          className="p-3 bg-red-500/10 text-red-600 text-sm font-bold rounded-[4px] border-l-4 border-red-500"
        >
          {error}
        </div>
      )}
    </>
  );
}

interface MfaChallengeStepProps {
  readonly code: string;
  readonly onCodeChange: (v: string) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly useBackupCode: boolean;
  readonly onToggleBackupCode: () => void;
  readonly secondsRemaining: number;
  readonly onBack: () => void;
}

/** Paso de desafío de login (Scenario 1/2 FC185, F4): código de 6 dígitos o de respaldo, con
 *  countdown y salida manual al paso 1. */
export default function MfaChallengeStep({
  code,
  onCodeChange,
  loading,
  error,
  onSubmit,
  useBackupCode,
  onToggleBackupCode,
  secondsRemaining,
  onBack,
}: MfaChallengeStepProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (raw: string): void => {
    onCodeChange(useBackupCode ? raw.toUpperCase() : raw.replace(/\D/g, ''));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" data-testid="mfa-challenge-step">
      <MfaChallengeHeader useBackupCode={useBackupCode} error={error} />
      <MfaChallengeCountdown secondsRemaining={secondsRemaining} />
      <MfaChallengeInputFields
        code={code}
        useBackupCode={useBackupCode}
        loading={loading}
        onChange={handleChange}
        inputRef={inputRef}
      />
      <MfaChallengeFooterLinks
        useBackupCode={useBackupCode}
        onToggleBackupCode={onToggleBackupCode}
        onBack={onBack}
      />
    </form>
  );
}
