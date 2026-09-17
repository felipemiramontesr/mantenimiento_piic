import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';

/**
 * FC185 F3 — paso 1 del asistente: escanear el QR (o capturar el secreto a mano) y confirmar con
 * el primer código real de la app autenticadora. `react-qr-code` (MIT, SVG nativo vía
 * `<svg>` — no canvas) es la única dependencia npm nueva de F3, decisión de GrayMan (2026-09-17):
 * el motor TOTP (F1) sigue 100% sin dependencias porque se pudo verificar contra los vectores
 * oficiales del RFC; un generador de QR hecho a mano no se puede verificar de la misma forma sin
 * escanearlo con una cámara real, así que se usa una librería pequeña y auditada solo para esto.
 */

const FIELD_LABEL_CLASS =
  'font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70';

interface CopySecretButtonProps {
  readonly secret: string;
}

/** Botón de copiar el secreto manual — extraído para mantener `MfaScanStep` bajo Gate 2. */
function CopySecretButton({ secret }: CopySecretButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    navigator.clipboard
      .writeText(secret)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid="mfa-copy-secret"
      className="inline-flex items-center gap-2 text-xs font-bold text-pinnacle-navy/60 hover:text-pinnacle-navy underline underline-offset-2"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copiado' : 'Copiar clave'}
    </button>
  );
}

interface MfaQrDisplayProps {
  readonly otpauthUri: string;
  readonly secretBase32: string;
}

/** QR + secreto manual — extraído para mantener `MfaScanStep` bajo Gate 2. */
function MfaQrDisplay({ otpauthUri, secretBase32 }: MfaQrDisplayProps): React.JSX.Element {
  return (
    <>
      <div className="flex justify-center bg-white p-4 rounded-[4px] border border-pinnacle-navy/10 w-fit mx-auto">
        <QRCode value={otpauthUri} size={180} level="M" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-pinnacle-navy/50 text-xs">¿No puedes escanear? Captúralo a mano:</p>
        <code
          data-testid="mfa-manual-secret"
          className="block text-pinnacle-navy font-mono text-sm tracking-[0.15em] bg-pinnacle-navy/[0.04] px-3 py-2 rounded-[4px] break-all"
        >
          {secretBase32}
        </code>
        <CopySecretButton secret={secretBase32} />
      </div>
    </>
  );
}

interface MfaCodeConfirmFieldsProps {
  readonly code: string;
  readonly onCodeChange: (v: string) => void;
  readonly loading: boolean;
}

/** Input de 6 dígitos + botón de submit — extraído para mantener `MfaScanStep` bajo Gate 2. */
function MfaCodeConfirmFields({
  code,
  onCodeChange,
  loading,
}: MfaCodeConfirmFieldsProps): React.JSX.Element {
  return (
    <>
      <div>
        <label htmlFor="mfa-confirm-code" className={FIELD_LABEL_CLASS}>
          Código de 6 dígitos
        </label>
        <input
          id="mfa-confirm-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e): void => onCodeChange(e.target.value.replace(/\D/g, ''))}
          className="w-full h-14 mt-1 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-2xl tracking-[0.5em] text-center font-bold text-pinnacle-navy outline-none focus:border-pinnacle-yellow rounded-[4px]"
          disabled={loading}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        data-testid="mfa-confirm-submit"
        className="btn-archon-primary w-full"
      >
        {loading ? 'Verificando...' : 'Activar MFA'}
      </button>
    </>
  );
}

interface MfaScanStepProps {
  readonly otpauthUri: string;
  readonly secretBase32: string;
  readonly code: string;
  readonly onCodeChange: (v: string) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
}

/** Paso 1: escanear/capturar + confirmar con un código real (Scenario del FC: "nunca queda
 *  enrolado un secreto que el usuario no demostró poder usar"). */
export default function MfaScanStep({
  otpauthUri,
  secretBase32,
  code,
  onCodeChange,
  loading,
  error,
  onSubmit,
}: MfaScanStepProps): React.JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-6" data-testid="mfa-scan-step">
      <div>
        <h3 className="text-pinnacle-navy font-display font-black text-2xl tracking-tight">
          Activa tu segundo factor
        </h3>
        <p className="text-pinnacle-navy/60 text-sm mt-1">
          Escanea este código con Google Authenticator, Microsoft Authenticator o Authy.
        </p>
      </div>

      <MfaQrDisplay otpauthUri={otpauthUri} secretBase32={secretBase32} />

      {error && (
        <div className="p-3 bg-red-500/10 text-red-600 text-sm font-bold rounded-[4px] border-l-4 border-red-500">
          {error}
        </div>
      )}

      <MfaCodeConfirmFields code={code} onCodeChange={onCodeChange} loading={loading} />
    </form>
  );
}
