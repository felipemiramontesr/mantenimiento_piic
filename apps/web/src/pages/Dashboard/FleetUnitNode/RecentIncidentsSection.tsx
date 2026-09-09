import React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, FileText } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { SectionCard, formatDate, SEVERITY_BADGE, SEVERITY_LABEL } from '../nodes/NodeShared';
import { NodeData } from './types';

/** "Incidentes Recientes" card — solo se renderiza si hay al menos 1. Extraída
 * de `FleetUnitNode.tsx` (FC167 F2 Gate2); mismo JSX verbatim. */
export function RecentIncidentsSection({
  incidents,
}: {
  readonly incidents: NodeData['incidents']['recent'];
}): React.JSX.Element | null {
  if (incidents.length === 0) return null;
  return (
    <SectionCard
      title="Incidentes Recientes"
      icon={<AlertTriangle size={16} className="text-[#f2b705]" />}
    >
      <div className="flex flex-col divide-y divide-slate-100">
        {incidents.map((inc) => (
          <div key={inc.id} className="flex items-start gap-4 py-3">
            <span
              className={`shrink-0 text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] mt-0.5 ${
                SEVERITY_BADGE[inc.severity] ?? 'bg-slate-100 text-slate-500'
              }`}
            >
              {SEVERITY_LABEL[inc.severity] ?? inc.severity}
            </span>
            <div className="flex-1 min-w-0">
              <p className={AT.cellLabel}>{inc.category}</p>
              <p className={`${AT.cellDetail} mt-0.5`}>{inc.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className={AT.cellMeta}>{formatDate(inc.reported_at)}</span>
              <span
                className={`block text-archon-xs font-black uppercase mt-0.5 ${
                  inc.status === 'OPEN' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {inc.status === 'OPEN' ? 'Abierto' : 'Resuelto'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/dashboard/incidents"
        className="inline-flex items-center gap-1.5 mt-3 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
      >
        <FileText size={12} /> Ver todos los incidentes
      </Link>
    </SectionCard>
  );
}

export default RecentIncidentsSection;
