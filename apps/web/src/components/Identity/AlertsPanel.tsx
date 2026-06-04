import React from 'react';
import { Wrench, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import useAlerts, { Alert, AlertSeverity, AlertType } from '../../hooks/useAlerts';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border border-amber-200',
  LOW: 'bg-blue-100 text-[#0f2a44]/60 border border-blue-200',
};

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-blue-400',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
};

const TYPE_ICON: Record<AlertType, React.ReactNode> = {
  MAINTENANCE_OVERDUE: <Wrench size={12} />,
  INCIDENT_OPEN: <AlertTriangle size={12} />,
  UNIT_CRITICAL: <Lock size={12} />,
};

const TYPE_LABEL: Record<AlertType, string> = {
  MAINTENANCE_OVERDUE: 'Mantenimiento vencido',
  INCIDENT_OPEN: 'Incidente abierto',
  UNIT_CRITICAL: 'Unidad bloqueada',
};

const HEADERS: ArchonTableHeader[] = [
  { key: 'severity', label: 'Severidad', align: 'center', width: '14%' },
  { key: 'type', label: 'Tipo', align: 'center', width: '22%' },
  { key: 'unit', label: 'Unidad', align: 'center', width: '12%' },
  { key: 'detail', label: 'Detalle', align: 'center', width: '52%' },
];

function AlertRow(alert: Alert): React.JSX.Element {
  const badge = SEVERITY_BADGE[alert.severity];
  const dot = SEVERITY_DOT[alert.severity];
  return (
    <tr key={alert.id} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[3px] ${badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          {SEVERITY_LABEL[alert.severity]}
        </span>
      </td>

      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#0f2a44]/70">
          {TYPE_ICON[alert.type]}
          {TYPE_LABEL[alert.type]}
        </span>
      </td>

      <td className="px-3 py-3 text-center">
        <span className="text-[10px] font-black font-mono text-[#0f2a44]">{alert.unitId}</span>
      </td>

      <td className="px-3 py-3 text-center">
        <p className="text-[11px] text-[#0f2a44]/70 leading-snug">{alert.description}</p>
      </td>
    </tr>
  );
}

const AlertsPanel: React.FC = (): React.JSX.Element => {
  const { alerts, isSyncing, refresh } = useAlerts();
  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();

  // 🛡️ Universal Search Protocol — Alertas
  React.useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, tipo de alerta o severidad...',
      getSuggestions: (term: string) => {
        const q = term.toLowerCase().trim();
        return alerts
          .filter(
            (a) =>
              a.unitId.toLowerCase().includes(q) ||
              TYPE_LABEL[a.type].toLowerCase().includes(q) ||
              SEVERITY_LABEL[a.severity].toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q)
          )
          .map((a) => ({
            id: a.id,
            title: a.unitId,
            subtitle: TYPE_LABEL[a.type],
            metaLabel: 'Severidad',
            metaValue: SEVERITY_LABEL[a.severity],
            rawItem: a,
          }));
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm((suggestion.rawItem as Alert).unitId);
      },
    });
    return () => setSearchConfig(null);
  }, [alerts, setSearchConfig, setSearchTerm]);

  React.useEffect(() => () => setSearchTerm(''), [setSearchTerm]);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return alerts;
    const q = searchTerm.toLowerCase().trim();
    return alerts.filter(
      (a) =>
        a.unitId.toLowerCase().includes(q) ||
        TYPE_LABEL[a.type].toLowerCase().includes(q) ||
        SEVERITY_LABEL[a.severity].toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [alerts, searchTerm]);

  const criticalCount = filtered.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = filtered.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-500">
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] ${SEVERITY_BADGE.CRITICAL}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT.CRITICAL}`} />
                {criticalCount} crítica{criticalCount !== 1 ? 's' : ''}
              </span>
            )}
            {highCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] ${SEVERITY_BADGE.HIGH}`}
              >
                {highCount} alta{highCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={refresh}
            className="text-[#0f2a44]/30 hover:text-[#0f2a44]/60 transition-colors"
            title="Actualizar alertas"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      <ArchonDataTable<Alert>
        data={filtered}
        headers={HEADERS}
        loading={isSyncing && alerts.length === 0}
        loadingMessage="Cargando alertas..."
        emptyMessage="Sin alertas activas"
        testId="alerts-table"
        variant="master"
        renderRow={(alert): React.ReactElement => <AlertRow key={alert.id} {...alert} />}
      />
    </div>
  );
};

export default AlertsPanel;
