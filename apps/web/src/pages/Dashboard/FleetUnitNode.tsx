import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Wrench,
  DollarSign,
  Shield,
  AlertTriangle,
  Activity,
  Gauge,
  Cog,
  FileText,
  Hash,
  ChevronLeft,
  Truck,
  TrendingUp,
  BarChart2,
  Zap,
  User,
  Leaf,
  Bell,
  Plus,
  CheckCircle,
  XCircle,
  Globe,
} from 'lucide-react';
import api from '../../api/client';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { useFleetIntelligence } from '../../hooks/useFleetIntelligence';
import { useEconomicLife } from '../../hooks/useEconomicLife';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { useOperatorScorecard } from '../../hooks/useOperatorScorecard';
import { useCo2 } from '../../hooks/useCo2';
import { useFleetRecalls, RecallStatus } from '../../hooks/useFleetRecalls';
import { useNhtsaRecalls, NhtsaRecall } from '../../hooks/useNhtsaRecalls';

import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import AT from '../../styles/archonTypography';
import { FleetUnit } from '../../types/fleet';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  formatMXN,
  formatDate,
  formatKm,
  formatNum,
  formatHours,
  formatPct,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
} from './nodes/NodeShared';

type VimPattern = {
  failure_category: string;
  occurrence_count: number;
  affected_units: number;
  avg_km_at_failure: number | null;
  confidence_score: number;
  nhtsa_covered: boolean;
  signal_level: 'SEÑAL' | 'INVESTIGAR' | 'DATOS_INSUFICIENTES';
};

// ─── Types ────────────────────────────────────────────────────────────────────

const VIM_SIGNAL_STYLES: Record<VimPattern['signal_level'], string> = {
  SEÑAL: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  INVESTIGAR: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  DATOS_INSUFICIENTES: 'bg-white/5 text-gray-500 border border-white/10',
};

type NodeUnit = FleetUnit & { owner?: string };

interface MaintenanceRecord {
  uuid: string;
  service_date: string;
  service_type: string;
  service_mode: string;
  cost: number;
  technician: string;
  odometer: number;
  status: string;
}

interface IncidentRecord {
  id: number;
  category: string;
  description: string;
  severity: string;
  status: string;
  reported_at: string;
}

interface NodeData {
  unit: NodeUnit;
  maintenance: { recentHistory: MaintenanceRecord[] };
  financial: { year: number; totalCost: number; byCategory: Record<string, number> };
  incidents: { recent: IncidentRecord[]; openCount: number };
}

// ─── Local helpers ────────────────────────────────────────────────────────────

const FLEET_STATUS_BADGE: Record<string, string> = {
  Disponible: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'En Ruta': 'bg-blue-100 text-blue-700 border border-blue-200',
  'En Mantenimiento': 'bg-amber-100 text-amber-700 border border-amber-200',
  Descontinuada: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const CATEGORY_LABEL: Record<string, string> = {
  LEASE: 'Arrendamiento',
  INSURANCE: 'Seguro',
  MAINTENANCE: 'Mantenimiento',
  FUEL: 'Combustible',
  TIRE: 'Llantas',
  FINE: 'Multas',
  REPAIR: 'Reparación',
  OTHER: 'Otros',
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  BASIC_10K: 'Servicio Básico 10K',
  INTERMEDIATE_20K: 'Servicio Intermedio 20K',
  MAJOR_30K: 'Servicio Mayor 30K',
  ADVANCED_50K: 'Servicio Avanzado 50K',
  MINOR_MINING: 'Servicio Menor Minero',
};

function statusBadgeClass(status: string): string {
  return FLEET_STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-500';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UnitHeader({
  unit,
  openIncidents,
}: {
  unit: NodeUnit;
  openIncidents: number;
}): React.JSX.Element {
  const [imgSrc, setImgSrc] = React.useState(unit.images?.[0] ?? '/img/archon-unit-default.png');
  const badge = statusBadgeClass(unit.status);
  const kpis = [
    { label: 'Disponibilidad', value: formatPct(unit.availabilityIndex ?? 100) },
    { label: 'Salud', value: unit.healthStatus ?? '—' },
    { label: 'MTBF', value: formatHours(unit.mtbfHours) },
    { label: 'Backlog', value: String(unit.backlogCount ?? 0) },
  ];

  return (
    <div className="card-archon-sovereign !flex-row !items-center gap-6 !p-6">
      <div className="w-28 h-28 shrink-0 rounded-[4px] overflow-hidden bg-slate-50 border border-slate-100">
        <img
          src={imgSrc}
          alt={unit.id}
          className="w-full h-full object-cover"
          onError={(): void => setImgSrc('/img/archon-unit-default.png')}
        />
      </div>

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
    </div>
  );
}

function KmRemainingValue({ kmRemaining }: { kmRemaining: number | null }): React.JSX.Element {
  if (kmRemaining == null) return <span>—</span>;
  const overdue = kmRemaining < 0;
  return (
    <span className={overdue ? 'text-red-600 font-black' : ''}>
      {formatKm(Math.abs(kmRemaining))}
      {overdue ? ' (vencido)' : ''}
    </span>
  );
}

function MaintenanceSection({
  unit,
  kmSinceService,
  kmRemaining,
}: {
  unit: NodeUnit;
  kmSinceService: number | null;
  kmRemaining: number | null;
}): React.JSX.Element {
  return (
    <SectionCard
      title="Inteligencia de Mantenimiento"
      icon={<Wrench size={16} className="text-[#f2b705]" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Último servicio</span>
          <InfoRow label="Fecha" value={formatDate(unit.lastServiceDate)} />
          <InfoRow label="Odómetro al servicio" value={formatKm(unit.lastServiceReading)} />
          <InfoRow label="Km desde el último" value={formatKm(kmSinceService)} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Pronóstico</span>
          <InfoRow label="Próximo servicio" value={formatKm(unit.nextServiceReading)} />
          <InfoRow label="Km restantes" value={<KmRemainingValue kmRemaining={kmRemaining} />} />
          <InfoRow label="Intervalo (km)" value={formatKm(unit.maintIntervalKm)} />
          <InfoRow
            label="Intervalo (días)"
            value={unit.maintIntervalDays ? `${unit.maintIntervalDays} días` : '—'}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Indicadores operacionales</span>
          <InfoRow label="Score de salud" value={formatPct(unit.healthScore)} />
          <InfoRow label="Disponibilidad" value={formatPct(unit.availabilityIndex)} />
          <InfoRow label="MTBF" value={formatHours(unit.mtbfHours)} />
          <InfoRow label="MTTR" value={formatHours(unit.mttrHours)} />
          <InfoRow label="Backlog" value={unit.backlogCount ?? 0} />
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Intelligence KPI Panel ───────────────────────────────────────────────────

function IntelligenceKpiSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useFleetIntelligence(unitId);

  const kpis = [
    {
      label: 'OEE',
      value: data?.oee != null ? formatPct(data.oee, 1) : '—',
      sub: 'Efectividad del equipo',
    },
    {
      label: 'TCO/km',
      value: data?.tco_per_km != null ? formatMXN(data.tco_per_km) : '—',
      sub: 'Costo total por km',
    },
    {
      label: 'Km/L',
      value: data?.km_per_liter != null ? formatNum(data.km_per_liter, 'km/L', 1) : '—',
      sub: 'Eficiencia de combustible',
    },
    {
      label: 'Cumpl. PM',
      value: data?.pm_compliance != null ? formatPct(data.pm_compliance, 1) : '—',
      sub: 'Adherencia a mantenimiento preventivo',
    },
    {
      label: 'Edad Backlog',
      value: data?.backlog_aging_days != null ? formatNum(data.backlog_aging_days, 'días', 1) : '—',
      sub: 'Antigüedad promedio del backlog',
    },
  ];

  return (
    <SectionCard
      title="Inteligencia de Flota"
      icon={<TrendingUp size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando KPIs…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {kpis.map(({ label, value, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 bg-[#0f2a44]/3 rounded-[4px] px-4 py-3 text-center"
            >
              <span className={AT.sectionDescription}>{label}</span>
              <span className="text-archon-lg font-black text-[#0f2a44]">{value}</span>
              <span className={AT.cellDetail}>{sub}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Economic Life Section ───────────────────────────────────────────────────

const RECOMMENDATION_BADGE: Record<string, string> = {
  KEEP: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  EVALUATE: 'bg-amber-100 text-amber-700 border border-amber-200',
  REPLACE: 'bg-red-100 text-red-700 border border-red-200',
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  KEEP: 'Conservar',
  EVALUATE: 'Evaluar',
  REPLACE: 'Reemplazar',
};

function EconomicLifeSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useEconomicLife(unitId);
  return (
    <SectionCard title="Vida Económica" icon={<BarChart2 size={16} className="text-[#f2b705]" />}>
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="Recomendación"
            value={
              data?.recommendation ? (
                <span
                  className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                    RECOMMENDATION_BADGE[data.recommendation] ?? ''
                  }`}
                >
                  {RECOMMENDATION_LABEL[data.recommendation] ?? data.recommendation}
                </span>
              ) : null
            }
          />
          <InfoRow label="Valor residual estimado" value={formatMXN(data?.residual_value_mxn)} />
          <InfoRow label="TCO acumulado" value={formatMXN(data?.accumulated_tco)} />
          <InfoRow
            label="Score de reemplazo"
            value={
              data?.replacement_score != null ? formatPct(data.replacement_score * 100, 0) : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── Anomaly Detection Section ───────────────────────────────────────────────

function AnomalySection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useAnomalyDetection(unitId);
  return (
    <SectionCard title="Detección de Anomalías" icon={<Zap size={16} className="text-[#f2b705]" />}>
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="Estado"
            value={
              data?.is_anomaly != null ? (
                <span
                  className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                    data.is_anomaly
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {data.is_anomaly ? 'Anomalía' : 'Normal'}
                </span>
              ) : null
            }
          />
          <InfoRow label="Algoritmo" value={data?.algorithm} />
          <InfoRow
            label="Desviación"
            value={data?.deviation_pct != null ? formatPct(data.deviation_pct, 1) : null}
          />
          <InfoRow
            label="Eficiencia de la unidad"
            value={
              data?.unit_km_per_liter != null ? formatNum(data.unit_km_per_liter, 'km/L', 2) : null
            }
          />
          <InfoRow
            label="Línea base de flota"
            value={
              data?.baseline_km_per_liter != null
                ? formatNum(data.baseline_km_per_liter, 'km/L', 2)
                : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── Operator Scorecard Section ──────────────────────────────────────────────

function OperatorScorecardSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useOperatorScorecard(unitId);
  return (
    <SectionCard
      title="Scorecard del Operador"
      icon={<User size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="ID del conductor principal"
            value={data?.driver_id != null ? String(data.driver_id) : null}
          />
          <InfoRow
            label="Rutas registradas"
            value={data?.route_count != null ? formatNum(data.route_count, 'rutas') : null}
          />
          <InfoRow
            label="Score compuesto"
            value={data?.composite_score != null ? formatPct(data.composite_score, 1) : null}
          />
          <InfoRow
            label="Eficiencia de combustible"
            value={
              data?.fuel_efficiency_score != null ? formatPct(data.fuel_efficiency_score, 1) : null
            }
          />
          <InfoRow
            label="Tasa de incidentes"
            value={
              data?.incident_rate_score != null ? formatPct(data.incident_rate_score, 1) : null
            }
          />
          <InfoRow
            label="Adherencia a checkpoints"
            value={
              data?.checkpoint_adherence_score != null
                ? formatPct(data.checkpoint_adherence_score, 1)
                : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── CO₂ Section ─────────────────────────────────────────────────────────────

function Co2Section({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useCo2(unitId);
  const period =
    data?.period_from && data.period_to ? `${data.period_from} — ${data.period_to}` : null;
  return (
    <SectionCard
      title="Huella de CO₂ (Scope 1 ESG)"
      icon={<Leaf size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="CO₂ total acumulado"
            value={data?.total_co2_kg != null ? formatNum(data.total_co2_kg, 'kg CO₂', 1) : null}
          />
          <InfoRow
            label="Litros totales cargados"
            value={data?.total_liters != null ? formatNum(data.total_liters, 'L', 1) : null}
          />
          <InfoRow
            label="Factor de emisión"
            value={
              data?.co2_factor_kg_per_liter != null
                ? formatNum(data.co2_factor_kg_per_liter, 'kg/L', 3)
                : null
            }
          />
          <InfoRow label="Combustible" value={data?.fuel_code} />
          <InfoRow label="Período analizado" value={period} />
        </>
      )}
    </SectionCard>
  );
}

// ─── Fleet Recalls Section ───────────────────────────────────────────────────

const RECALL_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const RECALL_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  NOT_APPLICABLE: 'No aplica',
};

const RECALL_HEADERS: ArchonTableHeader[] = [
  { key: 'code', label: 'Campaña', align: 'center', width: '14%' },
  { key: 'desc', label: 'Descripción', align: 'center', width: '34%' },
  { key: 'date', label: 'Publicación', align: 'center', width: '14%' },
  { key: 'status', label: 'Estado', align: 'center', width: '16%' },
  { key: 'actions', label: 'ACCIONES', align: 'center', width: '22%' },
];

type RecallLinkModalProps = {
  isOpen: boolean;
  onClose(): void;
  onConfirm(recallId: number): Promise<void>;
};

function RecallLinkModal({
  isOpen,
  onClose,
  onConfirm,
}: RecallLinkModalProps): React.JSX.Element | null {
  const [recallId, setRecallId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const id = parseInt(recallId, 10);
    if (!id || id <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(id);
      setRecallId('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vincular recall"
    >
      <div className="bg-[#0A0F1E] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 flex flex-col gap-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={18} className="text-amber-400" />
            Vincular Recall al Catálogo
          </h3>
          <p className="text-gray-400 text-sm">
            Ingresa el ID del recall del catálogo oficial para vincularlo a esta unidad.
          </p>
          <input
            type="number"
            min={1}
            placeholder="ID del recall (ej. 42)"
            value={recallId}
            onChange={(e): void => setRecallId(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[4px] text-white focus:outline-none focus:border-amber-400/50"
            aria-label="ID del recall"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-[4px] text-archon-sm font-black uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !recallId || parseInt(recallId, 10) <= 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 transition-colors rounded-[4px] text-white text-archon-sm font-black uppercase tracking-widest"
            >
              Vincular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type NhtsaResultsModalProps = {
  isOpen: boolean;
  make: string;
  model: string;
  year: number;
  onClose(): void;
  onImported(): void;
  linkRecall(recallId: number): Promise<void>;
};

function NhtsaResultsModal({
  isOpen,
  make,
  model,
  year,
  onClose,
  onImported,
  linkRecall,
}: NhtsaResultsModalProps): React.JSX.Element | null {
  const { results, loading, error, search, importRecall } = useNhtsaRecalls();
  const [activeTab, setActiveTab] = useState<'nhtsa' | 'vim'>('nhtsa');
  const [importingCode, setImportingCode] = useState<string | null>(null);
  const [vimResults, setVimResults] = useState<VimPattern[]>([]);
  const [vimLoading, setVimLoading] = useState(false);
  const [vimError, setVimError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      search(make, model, year);
    }
  }, [isOpen, search, make, model, year]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'vim') return;
    setVimLoading(true);
    setVimError(null);
    api
      .get<{ success: boolean; data: VimPattern[] }>(
        `/recalls/vim-patterns?make=${encodeURIComponent(make)}&model=${encodeURIComponent(
          model
        )}&year=${year}&scope=suite`
      )
      .then((res) => setVimResults(res.data.data))
      .catch(() => setVimError('No se pudieron cargar los patrones VIM.'))
      .finally(() => setVimLoading(false));
  }, [isOpen, activeTab, make, model, year]);

  if (!isOpen) return null;

  const handleImport = async (recall: NhtsaRecall): Promise<void> => {
    setImportingCode(recall.campaignNumber);
    try {
      const imported = await importRecall({
        campaignNumber: recall.campaignNumber,
        make,
        model,
        year,
        description: recall.summary,
      });
      await linkRecall(imported.recall_id);
      onImported();
      onClose();
    } finally {
      setImportingCode(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar recalls en NHTSA"
    >
      <div className="bg-[#0A0F1E] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe size={18} className="text-sky-400" />
              Recalls NHTSA — {make} {model} {year}
            </h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>

          <div className="flex gap-1 border-b border-white/10">
            {(['nhtsa', 'vim'] as const).map((tab) => (
              <button
                key={tab}
                onClick={(): void => setActiveTab(tab)}
                className={`px-4 py-2 text-archon-sm font-black uppercase tracking-widest transition-colors rounded-t-[4px] ${
                  activeTab === tab
                    ? 'text-sky-400 border-b-2 border-sky-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'nhtsa' ? 'NHTSA Oficial' : 'Patrones VIM'}
              </button>
            ))}
          </div>

          {activeTab === 'nhtsa' && (
            <div>
              {loading && (
                <p className="text-gray-400 text-sm text-center py-4">Consultando NHTSA…</p>
              )}
              {error && <p className="text-red-400 text-sm text-center py-4">{error}</p>}
              {!loading && !error && results.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  No se encontraron recalls para este modelo/año.
                </p>
              )}
              {!loading && results.length > 0 && (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {results.map((r) => (
                    <div
                      key={r.campaignNumber}
                      className="flex items-start justify-between gap-3 p-3 bg-white/5 rounded-[4px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-archon-xs font-black text-sky-300 uppercase tracking-widest">
                          {r.campaignNumber}
                        </p>
                        <p className="text-sm text-white mt-0.5 line-clamp-2">{r.subject}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.component}</p>
                      </div>
                      <button
                        title={`Importar recall ${r.campaignNumber}`}
                        onClick={(): void => {
                          handleImport(r);
                        }}
                        disabled={importingCode === r.campaignNumber}
                        className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 transition-colors rounded-[4px] text-white text-archon-xs font-black uppercase tracking-widest"
                      >
                        {importingCode === r.campaignNumber ? '…' : 'Importar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vim' && (
            <div>
              {vimLoading && (
                <p className="text-gray-400 text-sm text-center py-4">Analizando patrones VIM…</p>
              )}
              {vimError && <p className="text-red-400 text-sm text-center py-4">{vimError}</p>}
              {!vimLoading && !vimError && vimResults.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  Sin patrones de falla detectados para este modelo/año.
                </p>
              )}
              {!vimLoading && vimResults.length > 0 && (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {vimResults.map((p, i) => (
                    <div
                      key={`${p.failure_category}-${i}`}
                      className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-[4px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-archon-xs font-black text-amber-300 uppercase tracking-widest">
                          {p.failure_category}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.affected_units} unidades ·{' '}
                          {p.avg_km_at_failure != null
                            ? `${p.avg_km_at_failure.toLocaleString()} km prom.`
                            : 'km N/D'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.nhtsa_covered && (
                          <span
                            title="Cubierto por recall NHTSA"
                            className="text-xs text-sky-400 font-black uppercase tracking-widest border border-sky-400/40 rounded-[2px] px-1.5 py-0.5"
                          >
                            NHTSA
                          </span>
                        )}
                        <span
                          className={`text-xs font-black uppercase tracking-widest rounded-[2px] px-2 py-0.5 ${
                            VIM_SIGNAL_STYLES[p.signal_level]
                          }`}
                        >
                          {p.signal_level === 'DATOS_INSUFICIENTES'
                            ? 'DATOS INSUF.'
                            : p.signal_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type RecallsSectionProps = {
  unitId: string;
  make: string;
  model: string;
  year: number;
};

function RecallsSection({ unitId, make, model, year }: RecallsSectionProps): React.JSX.Element {
  const { recalls, loading, refresh, linkRecall, updateStatus } = useFleetRecalls(unitId);
  const [modalOpen, setModalOpen] = useState(false);
  const [nhtsaModalOpen, setNhtsaModalOpen] = useState(false);

  const handleComplete = useCallback(
    (recallId: number): void => {
      updateStatus(recallId, 'COMPLETED' as RecallStatus).catch(refresh);
    },
    [updateStatus, refresh]
  );
  const handleNotApplicable = useCallback(
    (recallId: number): void => {
      updateStatus(recallId, 'NOT_APPLICABLE' as RecallStatus).catch(refresh);
    },
    [updateStatus, refresh]
  );

  return (
    <>
      <RecallLinkModal
        isOpen={modalOpen}
        onClose={(): void => setModalOpen(false)}
        onConfirm={linkRecall}
      />
      <NhtsaResultsModal
        isOpen={nhtsaModalOpen}
        make={make}
        model={model}
        year={year}
        onClose={(): void => setNhtsaModalOpen(false)}
        onImported={refresh}
        linkRecall={linkRecall}
      />
      <SectionCard title="Recalls" icon={<Bell size={16} className="text-[#f2b705]" />}>
        <div className="flex justify-end mb-3 gap-2">
          <button
            title="Buscar recalls en NHTSA"
            onClick={(): void => setNhtsaModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
          >
            <Globe size={18} />
          </button>
          <button
            title="Vincular recall del catálogo"
            onClick={(): void => setModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
          >
            <Plus size={18} />
          </button>
        </div>
        <ArchonDataTable
          data={recalls}
          headers={RECALL_HEADERS}
          variant="embedded"
          emptyMessage="Sin recalls registrados para esta unidad"
          loading={loading}
          renderRow={(r): React.ReactElement => (
            <tr key={r.recall_id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-3 py-3 text-center">
                <span className={AT.cellMono}>{r.campaign_code}</span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={AT.cellValue}>{r.description}</span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={AT.cellMono}>{formatDate(r.published_date)}</span>
              </td>
              <td className="px-3 py-3 text-center">
                <span
                  className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                    RECALL_STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {RECALL_STATUS_LABEL[r.status] ?? r.status}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  {r.status !== 'COMPLETED' && (
                    <button
                      title="Marcar como completado"
                      onClick={(): void => handleComplete(r.recall_id)}
                      className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  {r.status === 'PENDING' && (
                    <button
                      title="Marcar como no aplica"
                      onClick={(): void => handleNotApplicable(r.recall_id)}
                      className="flex items-center justify-center w-10 h-10 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      </SectionCard>
    </>
  );
}

// ─── Maintenance Table ────────────────────────────────────────────────────────

const MAINT_HEADERS: ArchonTableHeader[] = [
  { key: 'date', label: 'Fecha', align: 'center', width: '14%' },
  { key: 'type', label: 'Tipo', align: 'center', width: '24%' },
  { key: 'odometer', label: 'Odómetro', align: 'center', width: '14%' },
  { key: 'cost', label: 'Costo', align: 'center', width: '14%' },
  { key: 'technician', label: 'Técnico', align: 'center', width: '20%' },
  { key: 'status', label: 'Estado', align: 'center', width: '14%' },
];

function MaintenanceRow(r: MaintenanceRecord): React.JSX.Element {
  const isCompleted = r.status === 'COMPLETED';
  return (
    <tr key={r.uuid} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{formatDate(r.service_date)}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellLabel}>{SERVICE_TYPE_LABEL[r.service_type] ?? r.service_type}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{formatKm(r.odometer)}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellValue}>{formatMXN(Number(r.cost))}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellValue}>{r.technician}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isCompleted ? 'Completado' : 'Activo'}
        </span>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FleetUnitNode: React.FC = (): React.JSX.Element => {
  const { unitId } = useParams<{ unitId: string }>();
  const { setSectionData } = useSovereignLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navState = location.state as { from?: string; fromLabel?: string } | null;
  const backTo = navState?.from ?? '/dashboard/fleet';
  const backLabel = navState?.fromLabel ?? 'Flota';
  const fromAlerts = backTo === '/dashboard/alerts';

  useEffect(() => {
    setSectionData(
      unitId ?? 'Unidad',
      'Perfil completo de activo · Mantenimiento · Finanzas · Cumplimiento',
      null,
      {
        variant: 'emerald',
        headerTitle: fromAlerts ? 'Alertas del Sistema' : 'Administrar Unidades',
        HeaderIcon: ChevronLeft,
        PayloadIcon: Truck,
        actionTitle: 'Retorno',
        description: fromAlerts ? 'Volver al panel de alertas' : 'Volver al listado de flota',
        buttonText: backLabel,
        isActive: false,
        onClick: (): void => navigate(backTo),
      }
    );
  }, [unitId, setSectionData, navigate, backTo, backLabel, fromAlerts]);

  useEffect(() => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/fleet/${unitId}/node`)
      .then((res) => setNode(res.data.data as NodeData))
      .catch(() => setError('No se pudo cargar el nodo de la unidad'))
      .finally(() => setLoading(false));
  }, [unitId]);

  if (loading) return <NodeLoadingState />;
  if (!node) return <NodeErrorState error={error} backTo="/dashboard/fleet" backLabel="Flota" />;

  const { unit, maintenance, financial, incidents } = node;
  const kmSinceService =
    unit.odometer && unit.lastServiceReading ? unit.odometer - unit.lastServiceReading : null;
  const kmRemaining =
    unit.nextServiceReading != null && unit.odometer != null
      ? unit.nextServiceReading - unit.odometer
      : null;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      <UnitHeader unit={unit} openIncidents={incidents.openCount} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Identidad & Registro"
          icon={<Hash size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Placas" value={unit.placas} />
          <InfoRow label="Número de serie" value={unit.numeroSerie} />
          <InfoRow label="Tarjeta de circulación" value={unit.circulationCardNumber} />
          <InfoRow label="Uso operacional" value={unit.uso} />
          <InfoRow label="Cuenta contable" value={unit.accountingAccount} />
          <InfoRow label="Propietario" value={unit.owner} />
          <InfoRow
            label="Pago arrendamiento"
            value={unit.monthlyLeasePayment ? formatMXN(unit.monthlyLeasePayment) : null}
          />
        </SectionCard>

        <SectionCard
          title="Especificaciones Técnicas"
          icon={<Cog size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Motor" value={unit.motor} />
          <InfoRow label="Combustible" value={unit.fuelType} />
          <InfoRow label="Tracción" value={unit.traccion} />
          <InfoRow label="Transmisión" value={unit.transmision} />
          <InfoRow label="Llantas" value={unit.tireSpec} />
          <InfoRow
            label="Uso diario promedio"
            value={unit.dailyUsageAvg ? formatNum(unit.dailyUsageAvg, 'km/día', 1) : null}
          />
          <InfoRow label="Capacidad de carga" value={formatNum(unit.capacidadCarga, 'kg')} />
          <InfoRow label="Tanque de combustible" value={formatNum(unit.fuelTankCapacity, 'L')} />
          <InfoRow
            label="Nivel de combustible"
            value={unit.lastFuelLevel != null ? formatPct(unit.lastFuelLevel, 0) : null}
          />
        </SectionCard>
      </div>

      <MaintenanceSection unit={unit} kmSinceService={kmSinceService} kmRemaining={kmRemaining} />

      <IntelligenceKpiSection unitId={unit.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EconomicLifeSection unitId={unit.id} />
        <AnomalySection unitId={unit.id} />
        <OperatorScorecardSection unitId={unit.id} />
        <Co2Section unitId={unit.id} />
      </div>

      <RecallsSection
        unitId={unit.id}
        make={unit.marca ?? ''}
        model={unit.modelo ?? ''}
        year={unit.year}
      />

      <SectionCard
        title="Historial de Mantenimiento"
        icon={<Activity size={16} className="text-[#f2b705]" />}
      >
        <ArchonDataTable<MaintenanceRecord>
          data={maintenance.recentHistory}
          headers={MAINT_HEADERS}
          variant="embedded"
          emptyMessage="Sin registros de mantenimiento"
          renderRow={(r): React.ReactElement => <MaintenanceRow key={r.uuid} {...r} />}
        />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title={`Resumen Financiero ${financial.year}`}
          icon={<DollarSign size={16} className="text-[#f2b705]" />}
        >
          {Object.entries(financial.byCategory).map(([cat, total]) => (
            <InfoRow key={cat} label={CATEGORY_LABEL[cat] ?? cat} value={formatMXN(total)} />
          ))}
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]">
              Total del año
            </span>
            <span className="text-archon-lg font-black text-[#0f2a44]">
              {formatMXN(financial.totalCost)}
            </span>
          </div>
          {financial.totalCost === 0 && (
            <p className={`${AT.sectionDescription} text-center pt-4`}>
              Sin transacciones registradas este año
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Cumplimiento & Legal"
          icon={<Shield size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Vencimiento seguro" value={formatDate(unit.insuranceExpiryDate)} />
          <InfoRow label="Póliza de seguro" value={unit.insurancePolicyNumber} />
          <InfoRow
            label="Costo del seguro"
            value={unit.insuranceCost ? formatMXN(unit.insuranceCost) : null}
          />
          <InfoRow label="Verificación" value={formatDate(unit.vencimientoVerificacion)} />
          <InfoRow label="Holográma ambiental" value={unit.environmentalHologram} />
          <InfoRow label="Cumplimiento legal" value={formatDate(unit.legalComplianceDate)} />
          <InfoRow label="Verif. mecánica" value={formatDate(unit.lastMechanicalVerification)} />
          <InfoRow
            label="Verif. ambiental"
            value={formatDate(unit.lastEnvironmentalVerification)}
          />
          <InfoRow label="Inicio de protocolo" value={formatDate(unit.protocolStartDate)} />
        </SectionCard>
      </div>

      {incidents.recent.length > 0 && (
        <SectionCard
          title="Incidentes Recientes"
          icon={<AlertTriangle size={16} className="text-[#f2b705]" />}
        >
          <div className="flex flex-col divide-y divide-slate-100">
            {incidents.recent.map((inc) => (
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
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <span className={AT.sectionDescription}>
          Última actualización: {formatDate(unit.updatedAt)}
        </span>
      </div>
    </div>
  );
};

export default FleetUnitNode;
