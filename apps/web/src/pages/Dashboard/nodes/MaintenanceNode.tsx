import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Wrench, Truck, CheckSquare, ExternalLink } from 'lucide-react';
import api from '../../../api/client';
import { useSovereignLayout } from '../../../context/SovereignLayoutContext';
import ArchonDataTable, { ArchonTableHeader } from '../../../components/UI/ArchonDataTable';
import AT from '../../../styles/archonTypography';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  NodeBackLink,
  formatMXN,
  formatDate,
  formatDateTime,
  formatKm,
  formatNum,
  formatPct,
  MOVEMENT_STATUS_BADGE,
  MOVEMENT_STATUS_LABEL,
} from './NodeShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskDetail {
  taskCode: string;
  status: string;
  notes: string | null;
  label: string;
  isCritical: boolean;
  statusLabel: string;
}

interface MaintenanceOrder {
  uuid: string;
  unit_id: string;
  movement_status: string;
  service_date: string;
  odometer_at_service: number;
  odometer_at_close: number | null;
  fuel_level_start: number;
  fuel_level_end: number | null;
  fuel_liters_loaded: number;
  fuel_amount: number;
  service_type: string;
  service_mode: string;
  system_recommended_type: string | null;
  cost: number;
  technician: string;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  details: TaskDetail[];
}

interface UnitSummary {
  id: string;
  status: string;
  marca: string;
  modelo: string;
  year: number;
  odometer: number;
  maintIntervalKm: number;
  lastFuelLevel: number;
}

interface NodeData {
  order: MaintenanceOrder;
  unit: UnitSummary | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABEL: Record<string, string> = {
  BASIC_10K: 'Servicio Básico 10K',
  INTERMEDIATE_20K: 'Servicio Intermedio 20K',
  MAJOR_30K: 'Servicio Mayor 30K',
  ADVANCED_50K: 'Servicio Avanzado 50K',
  MINOR_MINING: 'Servicio Menor Minero',
};

const SERVICE_MODE_LABEL: Record<string, string> = {
  FULL_COMPLIANCE: 'Cumplimiento completo',
  PARTIAL_EXECUTION: 'Ejecución parcial',
  IN_SITU: 'En sitio',
  WORKSHOP: 'Taller',
};

const TASK_STATUS_COLOR: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  REPLACED: 'bg-blue-100 text-blue-700',
  FAIL: 'bg-red-100 text-red-700',
  DEFERRED: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-slate-100 text-slate-500',
};

const TASK_HEADERS: ArchonTableHeader[] = [
  { key: 'critical', label: '', align: 'center', width: '5%' },
  { key: 'task', label: 'Tarea', align: 'left', width: '45%' },
  { key: 'status', label: 'Estado', align: 'center', width: '20%' },
  { key: 'notes', label: 'Notas', align: 'left', width: '30%' },
];

function TaskRow(t: TaskDetail): React.JSX.Element {
  const color = TASK_STATUS_COLOR[t.status] ?? 'bg-slate-100 text-slate-500';
  return (
    <tr key={t.taskCode} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-2 text-center">
        {t.isCritical && (
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Tarea crítica" />
        )}
      </td>
      <td className="px-3 py-2">
        <span className={AT.cellValue}>{t.label}</span>
        <span className={`block ${AT.cellMeta}`}>{t.taskCode}</span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] ${color}`}>
          {t.statusLabel}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className={AT.cellDetail}>{t.notes ?? '—'}</span>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MaintenanceNode: React.FC = (): React.JSX.Element => {
  const { uuid } = useParams<{ uuid: string }>();
  const { setSectionData } = useSovereignLayout();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSectionData(uuid ?? 'Orden', 'Detalle de orden de mantenimiento · Tareas · Telemetría');
  }, [uuid, setSectionData]);

  useEffect(() => {
    if (!uuid) return;
    setLoading(true);
    api
      .get(`/maintenance/${uuid}/node`)
      .then((res) => setNode(res.data.data as NodeData))
      .catch(() => setError('No se pudo cargar la orden de mantenimiento'))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) return <NodeLoadingState />;
  if (!node)
    return (
      <NodeErrorState error={error} backTo="/dashboard/maintenance" backLabel="Mantenimiento" />
    );

  const { order, unit } = node;
  const statusBadge = MOVEMENT_STATUS_BADGE[order.movement_status] ?? 'bg-slate-100 text-slate-500';
  const criticalCount = order.details.filter((t) => t.isCritical).length;
  const failCount = order.details.filter((t) => t.status === 'FAIL').length;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      <NodeBackLink to="/dashboard/maintenance" label="Mantenimiento" />

      {/* ── Cabecera ── */}
      <div className="card-archon-sovereign !p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xl font-black text-[#0f2a44] tracking-tight font-mono">
            {order.uuid.slice(0, 8).toUpperCase()}
          </span>
          <span
            className={`text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${statusBadge}`}
          >
            {MOVEMENT_STATUS_LABEL[order.movement_status] ?? order.movement_status}
          </span>
          <span className="text-archon-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] bg-[#0f2a44]/5 text-[#0f2a44]">
            {SERVICE_TYPE_LABEL[order.service_type] ?? order.service_type}
          </span>
          {failCount > 0 && (
            <span className="text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] bg-red-100 text-red-700">
              {failCount} tarea{failCount !== 1 ? 's' : ''} fallida{failCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-archon-base font-black text-[#0f2a44]/60">
            Técnico: <span className="text-[#0f2a44]">{order.technician}</span>
          </span>
          <span className="text-archon-base font-black text-[#0f2a44]/60">
            Fecha: <span className="text-[#0f2a44]">{formatDate(order.service_date)}</span>
          </span>
          <span className="text-archon-base font-black text-[#0f2a44]/60">
            Costo: <span className="text-[#0f2a44]">{formatMXN(order.cost)}</span>
          </span>
          {unit && (
            <Link
              to={`/dashboard/fleet/${unit.id}`}
              className="inline-flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
            >
              <Truck size={12} /> {unit.id} — {unit.marca} {unit.modelo} <ExternalLink size={11} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalles de la orden */}
        <SectionCard
          title="Detalles de la Orden"
          icon={<Wrench size={16} className="text-[#f2b705]" />}
        >
          <InfoRow
            label="Tipo de servicio"
            value={SERVICE_TYPE_LABEL[order.service_type] ?? order.service_type}
          />
          <InfoRow
            label="Modo de servicio"
            value={SERVICE_MODE_LABEL[order.service_mode] ?? order.service_mode}
          />
          <InfoRow
            label="Tipo recomendado"
            value={
              order.system_recommended_type
                ? SERVICE_TYPE_LABEL[order.system_recommended_type] ?? order.system_recommended_type
                : null
            }
          />
          <InfoRow label="Técnico" value={order.technician} />
          <InfoRow label="Fecha de servicio" value={formatDate(order.service_date)} />
          <InfoRow label="Inicio" value={formatDateTime(order.start_at)} />
          <InfoRow label="Cierre" value={formatDateTime(order.end_at)} />
          <InfoRow label="Costo total" value={formatMXN(order.cost)} />
          <InfoRow label="Tareas críticas" value={`${criticalCount} de ${order.details.length}`} />
        </SectionCard>

        {/* Telemetría */}
        <SectionCard title="Telemetría" icon={<Truck size={16} className="text-[#f2b705]" />}>
          <InfoRow label="Odómetro al ingresar" value={formatKm(order.odometer_at_service)} />
          <InfoRow label="Odómetro al cierre" value={formatKm(order.odometer_at_close)} />
          <InfoRow label="Nivel comb. inicio" value={formatPct(order.fuel_level_start, 0)} />
          <InfoRow label="Nivel comb. cierre" value={formatPct(order.fuel_level_end, 0)} />
          <InfoRow
            label="Litros cargados"
            value={order.fuel_liters_loaded ? formatNum(order.fuel_liters_loaded, 'L', 2) : null}
          />
          <InfoRow
            label="Importe combustible"
            value={order.fuel_amount ? formatMXN(order.fuel_amount) : null}
          />
          {unit && (
            <>
              <InfoRow label="Odómetro actual (unidad)" value={formatKm(unit.odometer)} />
              <InfoRow label="Intervalo mant." value={formatKm(unit.maintIntervalKm)} />
            </>
          )}
        </SectionCard>
      </div>

      {/* Tareas */}
      <SectionCard
        title={`Tareas del Servicio (${order.details.length})`}
        icon={<CheckSquare size={16} className="text-[#f2b705]" />}
      >
        <ArchonDataTable<TaskDetail>
          data={order.details}
          headers={TASK_HEADERS}
          variant="embedded"
          emptyMessage="Sin tareas registradas"
          renderRow={(t): React.ReactElement => <TaskRow key={t.taskCode} {...t} />}
        />
      </SectionCard>
    </div>
  );
};

export default MaintenanceNode;
