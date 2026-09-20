import React from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { maskEmail, type MailMode, type MailTestTone } from './mailDiagnosticMessages';
import useMailTest from './useMailTest';

/**
 * FC188 F2 — Diagnóstico de Correo del Sistema. Un botón dispara UN correo de prueba al correo
 * registrado de la propia cuenta de Ω y explica el resultado (ok, credenciales SMTP inválidas, sin
 * conexión, correo desactivado, límite de 3/hora). FC190: vive en su propia vista
 * (`MailDiagnosticModule`). FC191: la fila superior va en dos columnas — información a la izquierda,
 * botón a la derecha —; el transporte y el resultado quedan debajo, de ancho completo.
 */

const MODE_LABELS: Record<MailMode, string> = {
  smtp: 'SMTP (Hostinger)',
  memory: 'Memoria (solo pruebas)',
  disabled: 'Desactivado',
};

const TONE_STYLES: Record<MailTestTone, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-700',
};

/** Columna izquierda de la fila superior: ícono, título y descripción (destino enmascarado). */
function MailInfoColumn({ maskedEmail }: { readonly maskedEmail: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 text-left" data-testid="mail-diagnostic-info-column">
      <div className="w-8 h-8 shrink-0 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
        <Mail size={16} className="text-pinnacle-navy" />
      </div>
      <div>
        <h3 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
          Diagnóstico de Correo del Sistema
        </h3>
        <p className="text-archon-base text-pinnacle-navy/50 font-medium">
          Envía un correo de prueba a {maskedEmail} para verificar el buzón del sistema
        </p>
      </div>
    </div>
  );
}

interface MailActionColumnProps {
  readonly sending: boolean;
  readonly onSend: () => Promise<void>;
}

/** Columna derecha de la fila superior: el botón de envío (de ancho completo en móvil, a la derecha desde `md`). */
function MailActionColumn({ sending, onSend }: MailActionColumnProps): React.ReactElement {
  return (
    <div className="md:shrink-0 md:flex md:justify-end" data-testid="mail-diagnostic-action-column">
      <button
        type="button"
        className="btn-archon-primary disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={onSend}
        disabled={sending}
        data-testid="mail-diagnostic-send"
      >
        {sending && <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />}
        {sending ? 'Enviando…' : 'Enviar Correo de Prueba'}
      </button>
    </div>
  );
}

/** Tarjeta de diagnóstico: fila de dos columnas (información · botón), transporte activo y el
 *  resultado de la última prueba (`<output>`, rol `status` implícito, en éxito/advertencia;
 *  `role="alert"` en error). */
function MailDiagnosticCard(): React.ReactElement {
  const { currentUser } = useAuth();
  const maskedEmail = maskEmail(currentUser?.email);
  const { sending, outcome, sendTest } = useMailTest(maskedEmail);

  return (
    <div className="space-y-3 pt-4 border-t border-slate-200" data-testid="mail-diagnostic-card">
      <div
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        data-testid="mail-diagnostic-header-row"
      >
        <MailInfoColumn maskedEmail={maskedEmail} />
        <MailActionColumn sending={sending} onSend={sendTest} />
      </div>
      <p
        className="text-archon-base text-pinnacle-navy/70 font-medium"
        data-testid="mail-diagnostic-mode"
      >
        Transporte: {outcome?.mode ? MODE_LABELS[outcome.mode] : 'sin pruebas en esta sesión'}
      </p>
      {outcome && (
        <output
          role={outcome.tone === 'error' ? 'alert' : undefined}
          className={`block p-3 rounded border text-archon-base font-medium ${
            TONE_STYLES[outcome.tone]
          }`}
          data-testid="mail-diagnostic-outcome"
        >
          {outcome.message}
        </output>
      )}
    </div>
  );
}

export default MailDiagnosticCard;
