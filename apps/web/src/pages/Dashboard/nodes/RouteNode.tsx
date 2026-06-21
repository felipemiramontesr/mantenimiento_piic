import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Map, Truck, Fuel, AlertTriangle, ExternalLink, ChevronLeft, Flag } from 'lucide-react';
import api from '../../../api/client';
import { useSovereignLayout } from '../../../context/SovereignLayoutContext';
import AT from '../../../styles/archonTypography';
import { useCheckpoints } from '../../../hooks/useCheckpoints';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  formatMXN,
  formatDate,
  formatDateTime,
  formatKm,
  formatNum,
  formatPct,
  MOVEMENT_STATUS_BADGE,
  MOVEMENT_STATUS_LABEL,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
  INCIDENT_CATEGORY_LABEL,
} from './NodeShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteRecord {
  uuid: string;
  unit_id: string;
  status: string;
  start_reading: number;
  end_reading: number | null;
  start_at: string | null;
  end_at: string | null;
  fuel_level_start: number;
  fuel_level_end: number | null;
  fuel_liters_loaded: number | null;
  fuel_amount: number | null;
  fuel_ticket_image: string | null;
  additives_check: number;
  tire_pressure_json: string | null;
  checklist_json: string | null;
  description: string | null;
  created_at: string;
  driver_id: number;
  destination: string;
  driver_name: string | null;
  driver_role: string | null;
  unit_marca: string | null;
  unit_modelo: string | null;
  unit_year: number | null;
}

interface IncidentRecord {
  id: number;
  uuid: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  reported_at: string;
}

interface NodeData {
  route: RouteRecord;
  incidents: IncidentRecord[];
}

const CHECKPOINT_STATUS_BADGE: Record<string, string> = {
  VISITED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-slate-100 text-slate-500',
  SKIPPED: 'bg-amber-100 text-amber-700',
};

const CHECKPOINT_STATUS_LABEL: Record<string, string> = {
  VISITED: 'Visitado',
  PENDING: 'Pendiente',
  SKIPPED: 'Omitido',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const RouteNode: React.FC = (): React.JSX.Element => {
  const { uuid } = useParams<{ uuid: string }>();
  const { setSectionData } = useSovereignLayout();
  const navigate = useNavigate();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: checkpoints } = useCheckpoints(uuid ?? null);

  useEffect(() => {
    setSectionData(uuid ?? 'Ruta', 'Detalle de despacho · Telemetría · Incidentes', null, {
      variant: 'emerald',
      headerTitle: 'Administrar Rutas',
      HeaderIcon: ChevronLeft,
      PayloadIcon: Map,
      actionTitle: 'Retorno',
      description: 'Volver al registro de rutas',
      buttonText: 'Rutas',
      isActive: false,
      onClick: (): void => navigate('/dashboard/routes'),
    });
  }, [uuid, setSectionData, navigate]);

  useEffect(() => {
    if (!uuid) return;
    setLoading(true);
    api
      .get(`/routes/${uuid}/node`)
      .then((res) => setNode(res.data.data as NodeData))
      .catch(() => setError('No se pudo cargar la ruta'))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) return <NodeLoadingState />;
  if (!node) return <NodeErrorState error={error} backTo="/dashboard/routes" backLabel="Rutas" />;

  const { route, incidents } = node;
  const statusBadge = MOVEMENT_STATUS_BADGE[route.status] ?? 'bg-slate-100 text-slate-500';
  const kmRecorridos =
    route.end_reading != null && route.start_reading != null
      ? route.end_reading - route.start_reading
      : null;
  const fuelUsed =
    route.fuel_level_start != null && route.fuel_level_end != null
      ? route.fuel_level_start - route.fuel_level_end
      : null;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      {/* Cabecera */}
      <div className="card-archon-sovereign !p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xl font-black text-[#0f2a44] font-mono tracking-tight">
            {route.uuid.slice(0, 8).toUpperCase()}
          </span>
          <span
            className={`text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${statusBadge}`}
          >
            {MOVEMENT_STATUS_LABEL[route.status] ?? route.status}
          </span>
          {incidents.filter((i) => i.status === 'OPEN').length > 0 && (
            <span className="text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] bg-red-100 text-red-700">
              {incidents.filter((i) => i.status === 'OPEN').length} incidente
              {incidents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <span className="flex items-center gap-1.5 text-archon-base font-black text-[#0f2a44]/60">
            <Map size={13} /> {route.destination}
          </span>
          {route.driver_name && (
            <span className="text-archon-base font-black text-[#0f2a44]/60">
              Operador: <span className="text-[#0f2a44]">{route.driver_name}</span>
            </span>
          )}
          <Link
            to={`/dashboard/fleet/${route.unit_id}`}
            className="inline-flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
          >
            <Truck size={12} /> {route.unit_id}
            {route.unit_marca && ` — ${route.unit_marca} ${route.unit_modelo}`}
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Despacho */}
        <SectionCard title="Despacho & Ruta" icon={<Map size={16} className="text-[#f2b705]" />}>
          <InfoRow label="Destino" value={route.destination} />
          <InfoRow label="Operador" value={route.driver_name} />
          <InfoRow label="Rol" value={route.driver_role} />
          <InfoRow label="Inicio" value={formatDateTime(route.start_at)} />
          <InfoRow label="Cierre" value={formatDateTime(route.end_at)} />
          <InfoRow label="Lectura inicial" value={formatKm(route.start_reading)} />
          <InfoRow label="Lectura final" value={formatKm(route.end_reading)} />
          <InfoRow label="Km recorridos" value={formatKm(kmRecorridos)} />
          {route.description && <InfoRow label="Descripción" value={route.description} />}
        </SectionCard>

        {/* Combustible */}
        <SectionCard
          title="Telemetría de Combustible"
          icon={<Fuel size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Nivel inicio" value={formatPct(route.fuel_level_start, 0)} />
          <InfoRow label="Nivel cierre" value={formatPct(route.fuel_level_end, 0)} />
          <InfoRow
            label="Variación nivel"
            value={fuelUsed != null ? formatPct(fuelUsed, 0) : null}
          />
          <InfoRow
            label="Litros cargados"
            value={route.fuel_liters_loaded ? formatNum(route.fuel_liters_loaded, 'L', 2) : null}
          />
          <InfoRow
            label="Importe combustible"
            value={route.fuel_amount ? formatMXN(route.fuel_amount) : null}
          />
          <InfoRow label="Revisión aditivos" value={route.additives_check ? 'Sí' : 'No'} />
          {route.fuel_ticket_image && (
            <div className="mt-3">
              <span className={`block ${AT.cellMeta} mb-2`}>Imagen del ticket</span>
              <img
                src={route.fuel_ticket_image}
                alt="Ticket de combustible"
                className="max-h-40 rounded-[4px] object-contain border border-slate-100"
              />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Incidentes */}
      {incidents.length > 0 && (
        <SectionCard
          title={`Incidentes (${incidents.length})`}
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
                  <p className={AT.cellLabel}>
                    {INCIDENT_CATEGORY_LABEL[inc.category] ?? inc.category}
                  </p>
                  <p className={`${AT.cellDetail} mt-0.5`}>{inc.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={AT.cellMeta}>{formatDate(inc.reported_at)}</span>
                  <Link
                    to={`/dashboard/incidents/${inc.uuid}`}
                    className="block text-archon-xs font-black uppercase tracking-widest text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors mt-1"
                  >
                    Ver nodo <ExternalLink size={10} className="inline" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Checkpoints / Waypoints */}
      {checkpoints.length > 0 && (
        <SectionCard
          title={`Waypoints (${checkpoints.filter((c) => c.status === 'VISITED').length}/${
            checkpoints.length
          })`}
          icon={<Flag size={16} className="text-[#f2b705]" />}
        >
          <div className="flex flex-col divide-y divide-slate-100">
            {checkpoints.map((chk) => (
              <div key={chk.id} className="flex items-center gap-4 py-3">
                <span className="shrink-0 w-6 text-center text-archon-sm font-black text-[#0f2a44]/40">
                  {chk.sequence}
                </span>
                <span className="flex-1 text-archon-base font-bold text-[#0f2a44]">{chk.name}</span>
                {chk.arrived_at && (
                  <span className={`${AT.cellMeta} shrink-0`}>
                    {formatDateTime(chk.arrived_at)}
                  </span>
                )}
                {!chk.arrived_at && chk.eta && (
                  <span className={`${AT.cellMeta} shrink-0`}>ETA {formatDateTime(chk.eta)}</span>
                )}
                <span
                  className={`shrink-0 text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] ${
                    CHECKPOINT_STATUS_BADGE[chk.status] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {CHECKPOINT_STATUS_LABEL[chk.status] ?? chk.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <span className={AT.sectionDescription}>Creado: {formatDateTime(route.created_at)}</span>
      </div>
    </div>
  );
};

export default RouteNode;
