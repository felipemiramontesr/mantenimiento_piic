import React from 'react';
import { Bell, Wrench, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import useAlerts, { Alert, AlertSeverity, AlertType } from '../../hooks/useAlerts';

const SEVERITY_STYLES: Record<AlertSeverity, { badge: string; dot: string }> = {
  CRITICAL: {
    badge: 'bg-red-100 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
  HIGH: {
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    dot: 'bg-amber-400',
  },
  LOW: {
    badge: 'bg-blue-100 text-[#0f2a44]/60 border border-blue-200',
    dot: 'bg-blue-400',
  },
};

const TYPE_ICON: Record<AlertType, React.ReactNode> = {
  MAINTENANCE_OVERDUE: <Wrench size={14} />,
  INCIDENT_OPEN: <AlertTriangle size={14} />,
  UNIT_CRITICAL: <Lock size={14} />,
};

function AlertRow({ alert }: { alert: Alert }): React.JSX.Element {
  const style = SEVERITY_STYLES[alert.severity];
  return (
    <div className="flex gap-3 py-3 border-b border-[#0f2a44]/6 last:border-0">
      <div className="mt-0.5 shrink-0">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-[3px] text-[10px] ${style.badge}`}
        >
          {TYPE_ICON[alert.type]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] ${style.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {alert.severity}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/40">
            {alert.unitId}
          </span>
        </div>
        <p className="text-[11px] font-bold text-[#0f2a44] leading-tight truncate">{alert.title}</p>
        <p className="text-[10px] text-[#0f2a44]/50 mt-0.5 leading-snug line-clamp-2">
          {alert.description}
        </p>
      </div>
    </div>
  );
}

const AlertsPanel: React.FC = (): React.JSX.Element => {
  const { alerts, isSyncing, refresh } = useAlerts();

  if (isSyncing && alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <RefreshCw size={20} className="text-[#0f2a44]/20 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/30">
          Cargando alertas…
        </p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-[4px] flex items-center justify-center bg-[#0f2a44]/5">
          <Bell size={28} className="text-[#0f2a44]/20" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#0f2a44] opacity-40">
            Sin alertas activas
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44] opacity-20 mt-1">
            Las notificaciones del sistema aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      {/* Summary header */}
      <div className="flex items-center justify-between px-1 pb-3 mb-1 border-b border-[#0f2a44]/8">
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] bg-red-100 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {criticalCount} crítica{criticalCount !== 1 ? 's' : ''}
            </span>
          )}
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] bg-orange-100 text-orange-700 border border-orange-200">
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

      {/* Alert list */}
      <div>
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
