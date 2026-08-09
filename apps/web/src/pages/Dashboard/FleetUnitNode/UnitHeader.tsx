import React from 'react';
import { AlertTriangle, Gauge, Wrench } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { formatKm, formatHours, formatPct } from '../nodes/NodeShared';
import { NodeUnit } from './types';

const FLEET_STATUS_BADGE: Record<string, string> = {
  Disponible: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'En Ruta': 'bg-blue-100 text-blue-700 border border-blue-200',
  'En Mantenimiento': 'bg-amber-100 text-amber-700 border border-amber-200',
  Descontinuada: 'bg-slate-100 text-slate-500 border border-slate-200',
};

function statusBadgeClass(status: string): string {
  return FLEET_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-500';
}

function UnitHeaderPhoto({ unit }: { unit: NodeUnit }): React.JSX.Element {
  const [imgSrc, setImgSrc] = React.useState(unit.images?.[0] ?? '/img/archon-unit-default.png');
  return (
    <div className="w-28 h-28 shrink-0 rounded-[4px] overflow-hidden bg-slate-50 border border-slate-100">
      <img
        src={imgSrc}
        alt={unit.id}
        className="w-full h-full object-cover"
        onError={(): void => setImgSrc('/img/archon-unit-default.png')}
      />
    </div>
  );
}

function UnitHeaderIdentity({
  unit,
  badge,
  openIncidents,
}: {
  unit: NodeUnit;
  badge: string;
  openIncidents: number;
}): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl font-black text-[#f2b705] tracking-[0.15em]">{unit.id}</span>
        <span
          className={`inline-flex items-center text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${badge}`}
        >
          {unit.status}
        </span>
        {unit.assetType && <span className={AT.idBadge}>{unit.assetType}</span>}
        {openIncidents > 0 && (
          <span className="inline-flex items-center gap-1 text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle size={10} /> {openIncidents} incidente{openIncidents !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-xl font-black text-[#0f2a44] uppercase tracking-tight">
        {unit.marca} {unit.modelo}
        <span className="text-archon-lg font-bold text-[#0f2a44]/40 ml-2">· {unit.year}</span>
      </p>
      <div className="flex items-center gap-6 flex-wrap mt-1">
        <span className="flex items-center gap-1.5 text-archon-base font-black text-[#0f2a44]/60">
          <Gauge size={13} /> {formatKm(unit.odometer)}
        </span>
        {unit.departamento && (
          <span className="flex items-center gap-1.5 text-archon-base font-black text-[#0f2a44]/60">
            <Wrench size={13} /> {unit.departamento}
          </span>
        )}
        {unit.color && <span className={AT.cellSubtle}>{unit.color}</span>}
      </div>
    </div>
  );
}

type UnitHeaderKpi = { label: string; value: string };

function UnitHeaderKpiGrid({ kpis }: { kpis: UnitHeaderKpi[] }): React.JSX.Element {
  return (
    <div className="hidden md:grid grid-cols-2 gap-3 shrink-0">
      {kpis.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center bg-[#0f2a44]/3 rounded-[4px] px-4 py-2"
        >
          <span className={AT.sectionDescription}>{label}</span>
          <span className="text-archon-lg font-black text-[#0f2a44]">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Fleet unit header: photo, identity badges, and quick KPIs. */
export function UnitHeader({
  unit,
  openIncidents,
}: {
  unit: NodeUnit;
  openIncidents: number;
}): React.JSX.Element {
  const badge = statusBadgeClass(unit.status);
  const kpis = [
    { label: 'Disponibilidad', value: formatPct(unit.availabilityIndex ?? 100) },
    { label: 'Salud', value: unit.healthStatus ?? '—' },
    { label: 'MTBF', value: formatHours(unit.mtbfHours) },
    { label: 'Backlog', value: String(unit.backlogCount ?? 0) },
  ];

  return (
    <div className="card-archon-sovereign !flex-row !items-center gap-6 !p-6">
      <UnitHeaderPhoto unit={unit} />
      <UnitHeaderIdentity unit={unit} badge={badge} openIncidents={openIncidents} />
      <UnitHeaderKpiGrid kpis={kpis} />
    </div>
  );
}

export default UnitHeader;
