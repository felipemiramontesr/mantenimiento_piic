import React from 'react';
import { Ban, ClipboardCopy } from 'lucide-react';
import type { SecurityEvent } from './securityEventsApi';
import { EVENT_TYPE_LABEL } from './abuseReport';

/** Fecha UTC mostrada en la hora local de Ω. */
export function formatUtc(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-MX');
}

interface SecurityEventRowProps {
  readonly event: SecurityEvent;
  readonly copied: boolean;
  readonly onCopyReport: (event: SecurityEvent, ipAddress: string) => void;
  readonly onBlock: (ip: string) => void;
}

/** Una fila: sin IP en claro (> 15 días) no hay reporte ni bloqueo posibles. */
function SecurityEventRow({
  event,
  copied,
  onCopyReport,
  onBlock,
}: SecurityEventRowProps): React.JSX.Element {
  const { ipAddress } = event;
  const actions = ipAddress
    ? { copy: (): void => onCopyReport(event, ipAddress), block: (): void => onBlock(ipAddress) }
    : null;
  return (
    <tr className="border-b border-slate-100 text-xs" data-testid="security-event-row">
      <td className="py-3 px-3 font-medium text-pinnacle-navy">
        {EVENT_TYPE_LABEL[event.eventType]}
      </td>
      <td className="py-3 px-3 font-mono">
        {ipAddress ?? <span className="text-pinnacle-navy/40">Seudonimizada</span>}
      </td>
      <td className="py-3 px-3 font-mono text-pinnacle-navy/70">{event.targetPattern}</td>
      <td className="py-3 px-3 text-center">{event.hits}</td>
      <td className="py-3 px-3 text-pinnacle-navy/60">{formatUtc(event.firstSeenUtc)}</td>
      <td className="py-3 px-3 text-pinnacle-navy/60">{formatUtc(event.lastSeenUtc)}</td>
      <td className="py-3 px-3 text-right">
        <div className="inline-flex items-center gap-4">
          <button
            type="button"
            disabled={!actions}
            onClick={actions?.copy}
            className="inline-flex items-center gap-1 text-pinnacle-navy/70 hover:text-pinnacle-navy text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            <ClipboardCopy size={12} /> {copied ? 'Copiado' : 'Reporte de abuso'}
          </button>
          <button
            type="button"
            disabled={!actions}
            onClick={actions?.block}
            className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            <Ban size={12} /> Bloquear
          </button>
        </div>
      </td>
    </tr>
  );
}

interface SecurityEventsTableProps {
  readonly events: SecurityEvent[];
  readonly copiedKey: string | null;
  readonly onCopyReport: (event: SecurityEvent, ipAddress: string) => void;
  readonly onBlock: (ip: string) => void;
}

/** Llave estable de un evento agregado (tipo, IP seudónima, carnada). */
export function eventKey(event: SecurityEvent): string {
  return `${event.eventType}|${event.ipHash}|${event.targetPattern}`;
}

/** FC201 F3 — eventos de los últimos 15 días (tipo, IP, carnada, toques, primer y último). */
export default function SecurityEventsTable({
  events,
  copiedKey,
  onCopyReport,
  onBlock,
}: SecurityEventsTableProps): React.JSX.Element {
  if (events.length === 0) {
    return (
      <p
        className="py-6 text-center text-sm text-pinnacle-navy/40"
        data-testid="security-events-empty"
      >
        Sin eventos de seguridad en los últimos 15 días.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full" data-testid="security-events-table">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-pinnacle-navy/50 text-left">
            <th className="py-2 px-3">Trampa</th>
            <th className="py-2 px-3">IP</th>
            <th className="py-2 px-3">Carnada</th>
            <th className="py-2 px-3 text-center">Toques</th>
            <th className="py-2 px-3">Primero</th>
            <th className="py-2 px-3">Último</th>
            <th className="py-2 px-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <SecurityEventRow
              key={eventKey(event)}
              event={event}
              copied={copiedKey === eventKey(event)}
              onCopyReport={onCopyReport}
              onBlock={onBlock}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
