import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import api from '../../../../api/client';
import type { SecurityEvent } from './securityEventsApi';
import { buildAbuseReport } from './abuseReport';
import useSecurityEvents from './useSecurityEvents';
import SecurityEventsTable, { eventKey } from './SecurityEventsTable';
import DenyIpForm from './DenyIpForm';
import ActiveBlocksList from './ActiveBlocksList';

/** Host de la API al que apuntan los ataques (para el reporte de abuso). */
function targetHost(): string {
  try {
    return new URL(String(api.defaults.baseURL)).host;
  } catch {
    return window.location.host;
  }
}

/** Copia el reporte de abuso y devuelve la llave de la fila copiada. */
async function copyAbuseReport(event: SecurityEvent, ipAddress: string): Promise<string> {
  await navigator.clipboard.writeText(buildAbuseReport(event, ipAddress, targetHost()));
  return eventKey(event);
}

/**
 * FC201 F3 — tarjeta "Eventos de seguridad" de la Consola Soberana (solo Ω): eventos de las trampas
 * de los últimos 15 días, reporte de abuso copiable y bloqueo perimetral manual con revocación.
 */
export default function SecurityEventsCard(): React.JSX.Element {
  const { data, loading, error, refetch } = useSecurityEvents();
  const [blockIp, setBlockIp] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const onCopyReport = (event: SecurityEvent, ipAddress: string): void => {
    copyAbuseReport(event, ipAddress)
      .then(setCopiedKey)
      .catch(() => setCopiedKey(null));
  };

  return (
    <div
      className="card-archon-sovereign bg-white p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 [--card-accent:#b91c1c]"
      data-testid="security-events-card"
    >
      <div className="card-sovereign-header">
        <ShieldAlert size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">Eventos de Seguridad</h3>
      </div>
      {error && (
        <p className="text-sm text-red-500" data-testid="security-events-error">
          Error al cargar los eventos de seguridad.
        </p>
      )}
      {!loading && !error && (
        <SecurityEventsTable
          events={data.events}
          copiedKey={copiedKey}
          onCopyReport={onCopyReport}
          onBlock={setBlockIp}
        />
      )}
      <DenyIpForm ip={blockIp} onIp={setBlockIp} onBlocked={refetch} />
      <ActiveBlocksList blocks={data.blocks} onRevoked={refetch} />
    </div>
  );
}
