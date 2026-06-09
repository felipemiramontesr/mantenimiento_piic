import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Truck, Map, ExternalLink, ChevronLeft } from 'lucide-react';
import api from '../../../api/client';
import { useSovereignLayout } from '../../../context/SovereignLayoutContext';
import AT from '../../../styles/archonTypography';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  formatDate,
  formatDateTime,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
  INCIDENT_CATEGORY_LABEL,
} from './NodeShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncidentData {
  id: number;
  route_uuid: string;
  category: string;
  description: string;
  severity: string;
  evidence_image: string | null;
  status: string;
  reported_at: string;
  unit_id: string;
  route_start: string | null;
  route_end: string | null;
  destination: string;
  driver_id: number;
  driver_name: string | null;
  unit_marca: string | null;
  unit_modelo: string | null;
  unit_year: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Desestimado',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 border border-red-200',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  DISMISSED: 'bg-slate-100 text-slate-500 border border-slate-200',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const IncidentNode: React.FC = (): React.JSX.Element => {
  const { uuid } = useParams<{ uuid: string }>();
  const { setSectionData } = useSovereignLayout();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<IncidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSectionData(
      uuid ? uuid.slice(0, 8).toUpperCase() : 'Incidente',
      'Detalle de incidente · Contexto de ruta · Unidad',
      null,
      {
        variant: 'emerald',
        headerTitle: 'Incidentes',
        HeaderIcon: ChevronLeft,
        PayloadIcon: AlertTriangle,
        actionTitle: 'Retorno',
        description: 'Volver al registro de incidentes',
        buttonText: 'Incidentes',
        isActive: false,
        onClick: (): void => navigate('/dashboard/incidents'),
      }
    );
  }, [uuid, setSectionData, navigate]);

  useEffect(() => {
    if (!uuid) return;
    setLoading(true);
    api
      .get(`/incidents/${uuid}/node`)
      .then((res) => setIncident(res.data.data as IncidentData))
      .catch(() => setError('No se pudo cargar el incidente'))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) return <NodeLoadingState />;
  if (!incident)
    return <NodeErrorState error={error} backTo="/dashboard/incidents" backLabel="Incidentes" />;

  const sevBadge = SEVERITY_BADGE[incident.severity] ?? 'bg-slate-100 text-slate-500';
  const stsBadge = STATUS_BADGE[incident.status] ?? 'bg-slate-100 text-slate-500';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      {/* Cabecera */}
      <div className="card-archon-sovereign !p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xl font-black text-[#0f2a44]">Incidente #{incident.id}</span>
          <span
            className={`text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${sevBadge}`}
          >
            {SEVERITY_LABEL[incident.severity] ?? incident.severity}
          </span>
          <span
            className={`text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${stsBadge}`}
          >
            {STATUS_LABEL[incident.status] ?? incident.status}
          </span>
          <span className="text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] bg-[#0f2a44]/5 text-[#0f2a44]">
            {INCIDENT_CATEGORY_LABEL[incident.category] ?? incident.category}
          </span>
        </div>
        <p className={`${AT.cellDetail} mt-1 max-w-2xl`}>{incident.description}</p>
        <div className="flex items-center gap-6 flex-wrap mt-1">
          <span className={AT.cellMeta}>{formatDateTime(incident.reported_at)}</span>
          <Link
            to={`/dashboard/fleet/${incident.unit_id}`}
            className="inline-flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
          >
            <Truck size={12} /> {incident.unit_id}
            {incident.unit_marca && ` — ${incident.unit_marca} ${incident.unit_modelo}`}
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalles */}
        <SectionCard
          title="Detalles del Incidente"
          icon={<AlertTriangle size={16} className="text-[#f2b705]" />}
        >
          <InfoRow
            label="Categoría"
            value={INCIDENT_CATEGORY_LABEL[incident.category] ?? incident.category}
          />
          <InfoRow
            label="Severidad"
            value={SEVERITY_LABEL[incident.severity] ?? incident.severity}
          />
          <InfoRow label="Estado" value={STATUS_LABEL[incident.status] ?? incident.status} />
          <InfoRow label="Fecha reporte" value={formatDateTime(incident.reported_at)} />
          <InfoRow label="Descripción" value={incident.description} />
        </SectionCard>

        {/* Contexto de ruta */}
        <SectionCard title="Contexto de Ruta" icon={<Map size={16} className="text-[#f2b705]" />}>
          <InfoRow
            label="UUID de ruta"
            value={
              <Link
                to={`/dashboard/routes/${incident.route_uuid}`}
                className="inline-flex items-center gap-1 text-[#0f2a44] hover:text-[#f2b705] transition-colors"
              >
                {incident.route_uuid.slice(0, 8).toUpperCase()} <ExternalLink size={11} />
              </Link>
            }
          />
          <InfoRow label="Destino" value={incident.destination} />
          <InfoRow label="Operador" value={incident.driver_name} />
          <InfoRow label="Inicio ruta" value={formatDate(incident.route_start)} />
          <InfoRow label="Cierre ruta" value={formatDate(incident.route_end)} />
          <InfoRow
            label="Unidad"
            value={
              <Link
                to={`/dashboard/fleet/${incident.unit_id}`}
                className="inline-flex items-center gap-1 text-[#0f2a44] hover:text-[#f2b705] transition-colors"
              >
                {incident.unit_id}{' '}
                {incident.unit_marca &&
                  `— ${incident.unit_marca} ${incident.unit_modelo} (${incident.unit_year})`}
                <ExternalLink size={11} />
              </Link>
            }
          />
        </SectionCard>
      </div>

      {/* Evidencia fotográfica */}
      {incident.evidence_image && (
        <SectionCard
          title="Evidencia Fotográfica"
          icon={<AlertTriangle size={16} className="text-[#f2b705]" />}
        >
          <img
            src={incident.evidence_image}
            alt="Evidencia del incidente"
            className="max-h-80 rounded-[4px] object-contain border border-slate-100 mx-auto block"
          />
        </SectionCard>
      )}
    </div>
  );
};

export default IncidentNode;
