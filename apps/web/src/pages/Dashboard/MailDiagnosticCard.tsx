import React from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { maskEmail, type MailMode, type MailTestTone } from './mailDiagnosticMessages';
import useMailTest from './useMailTest';

/**
 * FC188 F2 — Diagnóstico de Correo del Sistema. Vive dentro de la Consola Soberana de
 * `SystemSettingsModule` (solo se monta para `isOmegaStrict()`). Un botón dispara UN correo de prueba
 * al correo registrado de la propia cuenta de Ω y explica el resultado (ok, credenciales SMTP
 * inválidas, sin conexión, correo desactivado, límite de 3/hora).
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

/** Tarjeta de diagnóstico: destino enmascarado, botón de envío, transporte activo y el resultado
 *  de la última prueba (`role="alert"` en error, `role="status"` en éxito/advertencia). */
function MailDiagnosticCard(): React.ReactElement {
  const { currentUser } = useAuth();
  const maskedEmail = maskEmail(currentUser?.email);
  const { sending, outcome, sendTest } = useMailTest(maskedEmail);

  return (
    <div className="space-y-3 pt-4 border-t border-slate-200" data-testid="mail-diagnostic-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
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
      <p
        className="text-archon-base text-pinnacle-navy/70 font-medium"
        data-testid="mail-diagnostic-mode"
      >
        Transporte: {outcome?.mode ? MODE_LABELS[outcome.mode] : 'sin pruebas en esta sesión'}
      </p>
      <button
        type="button"
        className="btn-archon-primary disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={sendTest}
        disabled={sending}
        data-testid="mail-diagnostic-send"
      >
        {sending && <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />}
        {sending ? 'Enviando…' : 'Enviar Correo de Prueba'}
      </button>
      {outcome && (
        <p
          role={outcome.tone === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded border text-archon-base font-medium ${TONE_STYLES[outcome.tone]}`}
          data-testid="mail-diagnostic-outcome"
        >
          {outcome.message}
        </p>
      )}
    </div>
  );
}

export default MailDiagnosticCard;
