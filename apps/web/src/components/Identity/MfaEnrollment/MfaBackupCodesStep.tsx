import React, { useState } from 'react';
import { Download, Copy, Check, ShieldAlert } from 'lucide-react';

/**
 * FC185 F3 — paso 2 del asistente: los 8 códigos de respaldo se muestran UNA sola vez (el backend
 * solo los entrega en la respuesta de `/mfa/confirm`, nunca se recalculan ni se vuelven a mostrar
 * — invariante 3 del FC). El usuario debe confirmar explícitamente que los guardó antes de
 * continuar.
 */

function downloadBackupCodes(codes: readonly string[]): void {
  const content = [
    'Archon ERP — Códigos de respaldo MFA',
    'Guarda este archivo en un lugar seguro. Cada código solo se puede usar una vez.',
    '',
    ...codes,
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'archon-mfa-backup-codes.txt';
  link.click();
  URL.revokeObjectURL(url);
}

interface BackupCodesActionsProps {
  readonly codes: readonly string[];
}

/** Botones de Copiar/Descargar — extraído para mantener el paso bajo Gate 2. */
function BackupCodesActions({ codes }: BackupCodesActionsProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = (): void => {
    navigator.clipboard
      .writeText(codes.join('\n'))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <div className="flex gap-4 justify-center">
      <button
        type="button"
        onClick={handleCopyAll}
        data-testid="mfa-backup-copy"
        className="inline-flex items-center gap-2 text-sm font-bold text-pinnacle-navy/70 hover:text-pinnacle-navy underline underline-offset-2"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copiados' : 'Copiar todos'}
      </button>
      <button
        type="button"
        onClick={(): void => downloadBackupCodes(codes)}
        data-testid="mfa-backup-download"
        className="inline-flex items-center gap-2 text-sm font-bold text-pinnacle-navy/70 hover:text-pinnacle-navy underline underline-offset-2"
      >
        <Download size={16} />
        Descargar .txt
      </button>
    </div>
  );
}

interface MfaBackupCodesStepProps {
  readonly codes: readonly string[];
  readonly onDone: () => void;
}

/** Paso 2: despliegue de los 8 códigos de un solo uso + confirmación explícita antes de cerrar el
 *  asistente. */
export default function MfaBackupCodesStep({
  codes,
  onDone,
}: MfaBackupCodesStepProps): React.JSX.Element {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="space-y-6" data-testid="mfa-backup-codes-step">
      <div className="text-center">
        <ShieldAlert className="mx-auto text-pinnacle-yellow" size={32} />
        <h3 className="text-pinnacle-navy font-display font-black text-2xl tracking-tight mt-2">
          Guarda tus códigos de respaldo
        </h3>
        <p className="text-pinnacle-navy/60 text-sm mt-1">
          Úsalos si pierdes acceso a tu app autenticadora. Cada uno funciona una sola vez — esta es
          la única vez que los verás.
        </p>
      </div>

      <div
        data-testid="mfa-backup-codes-grid"
        className="grid grid-cols-2 gap-2 bg-pinnacle-navy/[0.04] p-4 rounded-[4px]"
      >
        {codes.map((c) => (
          <code key={c} className="font-mono text-sm text-pinnacle-navy text-center py-1">
            {c}
          </code>
        ))}
      </div>

      <BackupCodesActions codes={codes} />

      <label className="flex items-center gap-3 justify-center text-sm text-pinnacle-navy/70 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e): void => setAcknowledged(e.target.checked)}
          data-testid="mfa-backup-acknowledge"
        />
        <span>Ya guardé mis códigos de respaldo en un lugar seguro</span>
      </label>

      <button
        type="button"
        onClick={onDone}
        disabled={!acknowledged}
        data-testid="mfa-backup-continue"
        className="btn-archon-primary w-full"
      >
        Continuar
      </button>
    </div>
  );
}
