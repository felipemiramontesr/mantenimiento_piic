import React from 'react';
import {
  Wrench,
  AlertTriangle,
  Lock,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Info,
  FileWarning,
  DollarSign,
  Receipt,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAlerts, { Alert, AlertSeverity, AlertType } from '../../hooks/useAlerts';
import usePermissions from '../../hooks/usePermissions';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

/** Feature Contract Alerts_Role_Scoped_Panel — slugs que habilitan la vista de alertas */
const ALERT_VIEW_PERMISSIONS = ['maint:view', 'route:view', 'fleet:view', 'financial:view'];

/** Contrato Alerts_Finance_Domain — chip-filter por dominio (mitigación de fatiga de alertas) */
const DOMAIN_FILTERS: Array<{ key: string; label: string; types: AlertType[] | null }> = [
  { key: 'all', label: 'Todos', types: null },
  { key: 'maint', label: 'Mantenimiento', types: ['MAINTENANCE_OVERDUE'] },
  { key: 'routes', label: 'Rutas', types: ['INCIDENT_OPEN'] },
  { key: 'fleet', label: 'Flota', types: ['UNIT_CRITICAL', 'COMPLIANCE_EXPIRY'] },
  {
    key: 'finance',
    label: 'Finanzas',
    types: ['LEASE_PAYMENT_MISSING', 'FINE_REGISTERED', 'EXPENSE_ANOMALY'],
  },
];

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
  COMPLIANCE_EXPIRY: <FileWarning size={12} />,
  LEASE_PAYMENT_MISSING: <DollarSign size={12} />,
  FINE_REGISTERED: <Receipt size={12} />,
  EXPENSE_ANOMALY: <TrendingUp size={12} />,
};

const TYPE_LABEL: Record<AlertType, string> = {
  MAINTENANCE_OVERDUE: 'Mantenimiento vencido',
  INCIDENT_OPEN: 'Incidente abierto',
  UNIT_CRITICAL: 'Unidad bloqueada',
  COMPLIANCE_EXPIRY: 'Cumplimiento por vencer',
  LEASE_PAYMENT_MISSING: 'Renta sin registrar',
  FINE_REGISTERED: 'Multa registrada',
  EXPENSE_ANOMALY: 'Gasto anómalo',
};

const SEVERITY_CONFIG: Array<{
  severity: AlertSeverity;
  icon: LucideIcon;
  bg: string;
  border: string;
  iconClass: string;
  countClass: string;
  labelClass: string;
  label: string;
}> = [
  {
    severity: 'CRITICAL',
    icon: ShieldAlert,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconClass: 'text-red-500',
    countClass: 'text-red-700',
    labelClass: 'text-red-500/60',
    label: 'Crítica',
  },
  {
    severity: 'HIGH',
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconClass: 'text-orange-500',
    countClass: 'text-orange-700',
    labelClass: 'text-orange-500/60',
    label: 'Alta',
  },
  {
    severity: 'MEDIUM',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconClass: 'text-amber-500',
    countClass: 'text-amber-700',
    labelClass: 'text-amber-500/60',
    label: 'Moderada',
  },
  {
    severity: 'LOW',
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconClass: 'text-blue-400',
    countClass: 'text-[#0f2a44]/60',
    labelClass: 'text-blue-400/60',
    label: 'Baja',
  },
];

const HEADERS: ArchonTableHeader[] = [
  { key: 'severity', label: 'Severidad', align: 'center', width: '13%' },
  { key: 'type', label: 'Tipo', align: 'center', width: '20%' },
  { key: 'unit', label: 'Unidad', align: 'center', width: '11%' },
  { key: 'detail', label: 'Detalle', align: 'center', width: '44%' },
  { key: 'actions', label: 'Acciones', align: 'center', width: '12%' },
];

function AlertRow(alert: Alert): React.JSX.Element {
  const badge = SEVERITY_BADGE[alert.severity];
  const dot = SEVERITY_DOT[alert.severity];
  return (
    <tr key={alert.id} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest px-2 py-1 rounded-[3px] ${badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          {SEVERITY_LABEL[alert.severity]}
        </span>
      </td>

      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center justify-center gap-1.5 ${AT.cellLabel} normal-case`}
        >
          {TYPE_ICON[alert.type]}
          {TYPE_LABEL[alert.type]}
        </span>
      </td>

      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{alert.unitId}</span>
      </td>

      <td className="px-3 py-3 text-center">
        <p className={AT.cellDetail}>{alert.description}</p>
      </td>

      <td className="px-3 py-3 text-center">
        <Link
          to={`/dashboard/fleet/${alert.unitId}`}
          state={{ from: '/dashboard/alerts', fromLabel: 'Alertas' }}
          title={`Ver nodo · ${alert.unitId}`}
          className="flex items-center justify-center w-10 h-10 mx-auto text-[#0f2a44] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group"
        >
          <ExternalLink
            size={16}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </Link>
      </td>
    </tr>
  );
}

const AlertsAccessFallback: React.FC = (): React.JSX.Element => {
  const { setSectionData } = useSovereignLayout();

  React.useEffect(() => {
    setSectionData(
      'Alertas del Sistema',
      'Monitor de alertas operativas de la flota',
      null,
      null,
      null
    );
  }, [setSectionData]);

  return (
    <div
      data-testid="alerts-access-fallback"
      className="flex flex-col items-center justify-center gap-3 p-16 bg-white rounded-[4px] border border-slate-200/50 animate-in fade-in duration-500"
    >
      <ShieldAlert size={28} className="text-[#0f2a44]/30" strokeWidth={2} />
      <p className="text-[13px] font-bold text-[#0f2a44]/60">
        Sin alertas disponibles para tu perfil
      </p>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0f2a44]/40">
        Tu rol no incluye permisos de visualización de alertas
      </p>
    </div>
  );
};

const AlertsPanelContent: React.FC = (): React.JSX.Element => {
  const { alerts, isSyncing } = useAlerts();
  const { searchTerm, setSearchTerm, setSearchConfig, setSectionData } = useSovereignLayout();
  const [activeDomain, setActiveDomain] = React.useState<string>('all');

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

  React.useEffect(() => (): void => setSearchTerm(''), [setSearchTerm]);

  const filtered = React.useMemo(() => {
    const domainTypes = DOMAIN_FILTERS.find((d) => d.key === activeDomain)?.types ?? null;
    const domainFiltered = domainTypes
      ? alerts.filter((a) => domainTypes.includes(a.type))
      : alerts;
    if (!searchTerm.trim()) return domainFiltered;
    const q = searchTerm.toLowerCase().trim();
    return domainFiltered.filter(
      (a) =>
        a.unitId.toLowerCase().includes(q) ||
        TYPE_LABEL[a.type].toLowerCase().includes(q) ||
        SEVERITY_LABEL[a.severity].toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [alerts, searchTerm, activeDomain]);

  // 🔱 Sovereign Header — Severity Summary Cards
  React.useEffect(() => {
    const countFor = (sev: AlertSeverity): number =>
      filtered.filter((a) => a.severity === sev).length;

    const headerSlot = (
      <div className="flex items-stretch gap-2 w-full">
        {SEVERITY_CONFIG.map(
          ({ severity, icon: Icon, bg, border, iconClass, countClass, labelClass, label }) => (
            <div
              key={severity}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-4 rounded-[4px] border ${bg} ${border}`}
            >
              <Icon size={18} className={iconClass} strokeWidth={2.5} />
              <span className={`text-[24px] font-black tabular-nums leading-none ${countClass}`}>
                {countFor(severity)}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-[0.12em] ${labelClass}`}>
                {label}
              </span>
            </div>
          )
        )}
      </div>
    );

    setSectionData(
      'Alertas del Sistema',
      'Monitor de alertas operativas de la flota',
      null,
      null,
      headerSlot
    );
  }, [filtered, setSectionData]);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-500">
      {/* 🔱 Chip-filter por dominio — Contrato Alerts_Finance_Domain */}
      <div
        data-testid="alerts-domain-filter"
        className="flex items-center gap-2 flex-wrap"
        role="group"
        aria-label="Filtrar alertas por dominio"
      >
        {DOMAIN_FILTERS.map(({ key, label }) => {
          const isActive = activeDomain === key;
          const chipClass = isActive
            ? 'bg-[#0f2a44] text-white shadow-sm'
            : 'bg-[#0f2a44]/5 text-[#0f2a44]/60 hover:bg-[#0f2a44]/10';
          return (
            <button
              key={key}
              type="button"
              data-testid={`domain-chip-${key}`}
              onClick={(): void => setActiveDomain(key)}
              className={`px-3 py-1.5 rounded-[4px] border-none outline-none text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 ${chipClass}`}
            >
              {label}
            </button>
          );
        })}
      </div>

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

const AlertsPanel: React.FC = (): React.JSX.Element => {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(ALERT_VIEW_PERMISSIONS)) {
    return <AlertsAccessFallback />;
  }
  return <AlertsPanelContent />;
};

export default AlertsPanel;
