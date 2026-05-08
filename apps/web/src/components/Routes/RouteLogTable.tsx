import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  ArrowRight,
  Gauge,
  Pencil,
  CheckCircle2,
  Navigation,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import { formatDateTime } from '../../utils/dateUtils';
import useRouteLogs from '../../hooks/useRouteLogs';
import IncidentReportForm from './IncidentReportForm';
import ForensicJournalTable from './ForensicJournalTable';

export interface RouteLog {
  id: string;
  uuid: string;
  unit_id: string;
  operator_id: string;
  origin: string;
  destination: string;
  description?: string;
  fuelLevel?: number;
  fuel_level_start?: number;
  fuel_level_end?: number;
  start_time: string;
  end_time: string | null;
  start_km: number;
  end_km: number | null;
  fuel_liters_loaded?: number;
  fuel_amount?: number;
  fuel_ticket_image?: string;
  additives_check?: number | boolean;
  tire_pressure_json?: string;
  checklist_json?: string;
  checklist_after_json?: string;
}

interface RouteLogTableProps {
  onEdit?: (l: RouteLog) => void;
}

const RouteLogRow = ({
  log,
  index,
  onEdit,
  onReport,
  onFinish,
}: {
  log: RouteLog;
  index: number;
  onEdit?: (l: RouteLog) => void;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
}): React.JSX.Element => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { users } = useUsers();
  const { units } = useFleet();

  const operator = users.find((u) => u.id === String(log.operator_id));
  const unit = units.find((u) => u.id === log.unit_id);

  const getStatus = (l: RouteLog): { label: string; color: string; bg: string; border: string } => {
    if (!l.end_time)
      return {
        label: 'EN RUTA',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      };
    return {
      label: 'FINALIZADA',
      color: 'text-[#0f2a44]',
      bg: 'bg-[#0f2a44]/5',
      border: 'border-[#0f2a44]/10',
    };
  };

  const status = getStatus(log);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={(): void => setIsExpanded(!isExpanded)}
        className={`cursor-pointer transition-all duration-300 hover:bg-[#0f2a44]/[0.02] ${
          isExpanded ? 'bg-[#0f2a44]/[0.04] shadow-inner' : ''
        }`}
      >
        <td className="py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-[4px] border-2 border-white shadow-sm overflow-hidden bg-[#0f2a44]/5 flex items-center justify-center">
                {operator?.imageUrl ? (
                  <img
                    src={operator.imageUrl}
                    alt="Operator"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0f2a44] text-white text-[14px] font-black uppercase">
                    {operator?.fullName?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-[4px] border-2 border-white shadow-xs flex items-center justify-center">
                <User size={8} className="text-white" />
              </div>
            </div>
            <div className="text-left">
              <p className="text-[12px] font-black text-[#0f2a44] leading-tight">
                {operator?.fullName || 'Operador Externo'}
              </p>
              <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                ID: {operator?.employeeNumber || '0000'}
              </p>
            </div>
          </div>
        </td>

        <td className="py-6">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-20 h-20 rounded-[4px] border border-[rgba(15,42,68,0.1)] overflow-hidden bg-gray-50 flex items-center justify-center mb-1 shadow-sm">
              {unit?.images?.[0] ? (
                <img src={unit.images[0]} alt="Unit" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center opacity-20 gap-1">
                  <Truck size={32} className="text-[#0f2a44]" />
                  <span className="text-[6px] font-black uppercase tracking-[0.2em]">NO MEDIA</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-[12px] font-black text-[#0f2a44] leading-tight tracking-tighter bg-[#0f2a44]/5 px-2 py-0.5 rounded-[3px] inline-block mb-1">
                {log.unit_id}
              </p>
              <p className="text-[9px] font-bold text-[#0f2a44] opacity-40 uppercase tracking-tighter">
                {unit?.marca} {unit?.modelo}
              </p>
            </div>
          </div>
        </td>

        <td className="py-6">
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center gap-2">
              <Navigation size={12} className="text-emerald-500" />
              <p className="text-[11px] font-black text-[#0f2a44] tracking-tight">
                {log.destination}
              </p>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span className="text-[9px] font-bold uppercase">
                  {formatDateTime(log.start_time)}
                </span>
              </div>
              <ArrowRight size={8} />
              <span className="text-[9px] font-bold uppercase">{log.origin || 'Base Arian'}</span>
            </div>
          </div>
        </td>

        <td className="py-6">
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center gap-2">
              <Gauge size={12} className="text-[#0f2a44]/30" />
              <p className="text-[11px] font-black text-[#0f2a44]">
                {(log.start_km ?? 0).toLocaleString()} <span className="opacity-40">KM</span>
              </p>
            </div>
            {log.end_km && (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <p className="text-[11px] font-black text-[#0f2a44]">
                  {(log.end_km ?? 0).toLocaleString()} <span className="opacity-40">KM</span>
                </p>
              </div>
            )}
          </div>
        </td>

        <td className="py-6">
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-[4px] text-[9px] font-black tracking-widest border ${status.bg} ${status.color} ${status.border}`}
            >
              {status.label}
            </span>
          </div>
        </td>

        <td className="py-6 px-4">
          <div className="flex justify-center gap-2">
            {!log.end_time && (
              <button
                onClick={(e: React.MouseEvent): void => {
                  e.stopPropagation();
                  onReport(log);
                }}
                title="Reportar Incidencia"
                className="flex items-center justify-center w-10 h-10 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none text-rose-600 bg-rose-50 hover:bg-rose-100"
              >
                <AlertTriangle
                  size={18}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </button>
            )}
            <button
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onEdit?.(log);
              }}
              title="Editar Registro (Auditado)"
              className="flex items-center justify-center w-10 h-10 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none text-[#0f2a44] bg-gray-50 hover:bg-gray-100"
            >
              <Pencil
                size={18}
                className="transition-transform duration-300 group-hover:rotate-12"
              />
            </button>
            {!log.end_time && (
              <button
                onClick={(e: React.MouseEvent): void => {
                  e.stopPropagation();
                  onFinish(log);
                }}
                title="Finalizar Misión"
                className="flex items-center justify-center w-10 h-10 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none text-[#f2b705] bg-amber-50/30 hover:bg-amber-100/50"
              >
                <CheckCircle2
                  size={18}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </button>
            )}
          </div>
        </td>
      </motion.tr>

      <tr>
        <td colSpan={6} className="p-0 border-none">
          <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
            <div className="accordion-inner bg-gray-50/50 border-b border-[#0f2a44]/5">
              <ForensicJournalTable unitId={log.unit_id} hideHeader />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};

const RouteLogTable: React.FC<RouteLogTableProps> = ({ onEdit }) => {
  const { logs, isSyncing, refresh } = useRouteLogs();
  const [reportingRoute, setReportingRoute] = React.useState<RouteLog | null>(null);

  return (
    <div className="glass-card-pro bg-white !px-0 !pt-0 !pb-8 overflow-x-auto shadow-2xl rounded-[4px] custom-scrollbar animate-in fade-in duration-700 relative">
      {isSyncing && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#0f2a44] opacity-30">
            Syncing
          </span>
        </div>
      )}
      {!reportingRoute ? (
        <table data-testid="archon-route-log-table" className="archon-registry-table w-full">
          <thead>
            <tr>
              <th>OPERADOR</th>
              <th>ACTIVO / UNIDAD</th>
              <th>MISIÓN / TRAYECTO</th>
              <th>TELEMETRÍA</th>
              <th>ESTADO</th>
              <th>AJUSTES</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(
              (log, index): React.JSX.Element => (
                <RouteLogRow
                  key={log.uuid}
                  log={log}
                  index={index}
                  onEdit={onEdit}
                  onReport={(l): void => setReportingRoute(l)}
                  onFinish={(l): void => onEdit?.(l)}
                />
              )
            )}
          </tbody>
        </table>
      ) : (
        <IncidentReportForm
          routeUuid={reportingRoute.uuid}
          unitId={reportingRoute.unit_id}
          onClose={(): void => setReportingRoute(null)}
          onSuccess={(): void => {
            setReportingRoute(null);
            refresh();
          }}
        />
      )}
    </div>
  );
};

export default RouteLogTable;
