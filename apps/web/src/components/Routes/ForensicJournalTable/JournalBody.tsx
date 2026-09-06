import React from 'react';
import { Activity } from 'lucide-react';
import { FleetUnit } from '../../../types/fleet';
import ArchonDataTable, { ArchonTableHeader } from '../../UI/ArchonDataTable';
import { ActivityLog, ForensicJournalTableProps } from './types';
import JournalRow from './JournalRow';

function RouteHealthCheckBanner(): React.JSX.Element {
  return (
    <div className="w-full py-4 bg-slate-50/50 border-y border-slate-100 flex items-center justify-center gap-3 animate-pulse">
      <Activity size={16} className="text-slate-300 animate-spin" />
      <span className="text-archon-md font-black text-slate-400 uppercase tracking-[0.3em]">
        Verificando Salud de Ruta...
      </span>
    </div>
  );
}

function RouteHealthyBanner(): React.JSX.Element {
  return (
    <div className="w-full py-4 bg-emerald-50/50 border-y border-emerald-100 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <Activity size={16} className="text-emerald-500 animate-pulse" />
      <span className="text-archon-md font-black text-emerald-600 uppercase tracking-[0.3em]">
        Ruta Saludable
      </span>
    </div>
  );
}

function buildHeaders(unitId: string | undefined): ArchonTableHeader[] {
  return [
    { key: 'fecha', label: 'FECHA / HORA' },
    { key: 'folio', label: 'FOLIO' },
    ...(!unitId ? [{ key: 'activo', label: 'ACTIVO' }] : []),
    { key: 'evento', label: 'EVENTO / IMPACTO' },
    { key: 'descripcion', label: 'DESCRIPCIÓN / NOTA' },
    { key: 'modificacion', label: 'MODIFICACIÓN' },
    { key: 'responsable', label: 'RESPONSABLE' },
  ] as ArchonTableHeader[];
}

export interface JournalBodyProps extends ForensicJournalTableProps {
  logs: ActivityLog[];
  loading: boolean;
  units: FleetUnit[];
  sessionEvidence: Map<string, { maxObserved: number }>;
}

/** Decide entre el banner de verificación de ruta, el banner "ruta
 * saludable", o la tabla forense completa — extraído de
 * `ForensicJournalTable` para mantenerlo bajo el presupuesto de Gate2
 * (FC165 F3 Slice3.1 Batch4, Dual-Gate Isolation). */
export default function JournalBody({
  unitId,
  routeUuid,
  logs,
  loading,
  units,
  sessionEvidence,
}: JournalBodyProps): React.ReactNode {
  if (loading && routeUuid) return <RouteHealthCheckBanner />;
  if (logs.length === 0 && routeUuid && !loading) return <RouteHealthyBanner />;

  const emptyMsg = routeUuid
    ? 'Ruta Saludable | No existen Incidencias'
    : 'Sin registros forenses para esta unidad';

  return (
    <ArchonDataTable
      className={unitId ? '!w-full !shadow-none !rounded-none !border-none' : ''}
      testId="forensic-journal-table"
      variant={unitId ? 'embedded' : 'master'}
      loading={loading}
      loadingMessage="Accediendo a Memoria Forense..."
      data={logs}
      headers={buildHeaders(unitId)}
      emptyMessage={emptyMsg}
      renderRow={(log: ActivityLog): React.ReactNode => (
        <JournalRow
          key={log.id}
          log={log}
          unitId={unitId}
          units={units}
          sessionEvidence={sessionEvidence}
        />
      )}
    />
  );
}
