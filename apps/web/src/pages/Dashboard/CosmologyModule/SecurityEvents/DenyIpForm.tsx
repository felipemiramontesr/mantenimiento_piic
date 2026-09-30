import React, { useState } from 'react';
import { Ban, Clock, Globe2, FileText } from 'lucide-react';
import ArchonField from '../../../../components/ArchonField';
import ArchonSelect from '../../../../components/ArchonSelect';
import { denyIp } from './securityEventsApi';

/** Duraciones ofrecidas (el backend acepta de 1 h a 30 días). */
export const DURATION_OPTIONS = [
  { value: '1', label: '1 hora' },
  { value: '24', label: '24 horas' },
  { value: '168', label: '7 días' },
  { value: '720', label: '30 días' },
];

interface DenyIpFieldsProps {
  readonly ip: string;
  readonly onIp: (ip: string) => void;
  readonly hours: string;
  readonly onHours: (hours: string) => void;
  readonly reason: string;
  readonly onReason: (reason: string) => void;
}

/** IP, duración y motivo del bloqueo — extraído para mantener `DenyIpForm` bajo presupuesto. */
function DenyIpFields({
  ip,
  onIp,
  hours,
  onHours,
  reason,
  onReason,
}: DenyIpFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ArchonField label="IP a bloquear" icon={Globe2} required>
        <input
          required
          value={ip}
          onChange={(e): void => onIp(e.target.value)}
          data-testid="deny-ip-input"
          className="archon-input font-mono"
        />
      </ArchonField>
      <ArchonField label="Duración" icon={Clock} required>
        <ArchonSelect options={DURATION_OPTIONS} value={hours} onChange={onHours} />
      </ArchonField>
      <ArchonField label="Motivo" icon={FileText}>
        <input
          value={reason}
          maxLength={255}
          onChange={(e): void => onReason(e.target.value)}
          data-testid="deny-ip-reason"
          className="archon-input"
        />
      </ArchonField>
    </div>
  );
}

interface DenyIpFormProps {
  readonly ip: string;
  readonly onIp: (ip: string) => void;
  readonly onBlocked: () => void;
}

/** FC201 F3 (P4) — bloqueo perimetral manual con vencimiento. Nunca afecta login, refresh, MFA ni
 *  el reto anti-bot, y quien tenga sesión válida pasa aunque su IP esté bloqueada (Inv-3). */
export default function DenyIpForm({ ip, onIp, onBlocked }: DenyIpFormProps): React.JSX.Element {
  const [hours, setHours] = useState(DURATION_OPTIONS[1].value);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    denyIp(ip.trim(), Number(hours), reason)
      .then(() => {
        onIp('');
        setReason('');
        onBlocked();
      })
      .catch(() => setError('No se pudo bloquear la IP. Revisa que sea una IP válida.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="deny-ip-form">
      <DenyIpFields
        ip={ip}
        onIp={onIp}
        hours={hours}
        onHours={setHours}
        reason={reason}
        onReason={setReason}
      />
      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
      <button
        type="submit"
        disabled={submitting || ip.trim().length === 0}
        data-testid="deny-ip-submit"
        className="btn-sentinel-emerald text-sm disabled:opacity-50"
      >
        <Ban size={14} />
        {submitting ? 'Bloqueando…' : 'Bloquear IP'}
      </button>
    </form>
  );
}
