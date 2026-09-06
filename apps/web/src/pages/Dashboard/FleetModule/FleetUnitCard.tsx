import React from 'react';
import { ShieldAlert, Gauge, MapPin } from 'lucide-react';
import { FleetUnit } from '../../../types/fleet';
import { CardMetricRow, CardAlertBadge } from '../../../components/Common/ArchonCardView';
import { deriveFleetAlert } from './fleetFormMapping';

/** FC 074 F3 / FC 078 F2(b) — render de tarjeta para la vista CARDS del
 * contenedor adaptativo (receta v2: header+badge, identidad, 2 métricas,
 * alerta activa opcional — piloto FC 041, grid interno de FleetGridView
 * intacto). */
export default function renderFleetCard(unit: FleetUnit): React.ReactNode {
  const alert = deriveFleetAlert(unit);
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-pinnacle-navy text-archon-md truncate">{unit.id}</span>
        <span className="shrink-0 px-2 py-0.5 rounded-[4px] bg-pinnacle-navy/5 text-pinnacle-navy/70 text-archon-xs font-bold uppercase tracking-widest">
          {unit.status}
        </span>
      </div>
      <div className="text-pinnacle-navy/70 text-archon-base truncate">
        {unit.marca} {unit.modelo}
      </div>
      <div className="text-pinnacle-navy/40 text-archon-sm uppercase tracking-widest truncate">
        {unit.placas || 'Sin placas'}
      </div>
      <div className="flex flex-col gap-1 pt-2 border-t border-pinnacle-navy/5">
        <CardMetricRow
          icon={<Gauge size={12} />}
          label="Odómetro"
          value={`${unit.odometer.toLocaleString()} km`}
        />
        <CardMetricRow
          icon={<MapPin size={12} />}
          label="Sede"
          value={unit.sede || unit.departamento || '—'}
        />
      </div>
      {alert && (
        <CardAlertBadge tone={alert.tone}>
          <ShieldAlert size={12} />
          {alert.label}
        </CardAlertBadge>
      )}
    </div>
  );
}
