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

interface RouteLogRowProps {
  log: RouteLog;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (l: RouteLog) => void;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
}

const RouteLogRow = ({
  log,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onReport,
  onFinish,
}: RouteLogRowProps): React.JSX.Element => {
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
        onClick={onToggle}
        className={`cursor-pointer transition-all duration-300 hover:bg-[#0f2a44]/[0.02] ${
          isExpanded ? 'expanded-focus-blue shadow-inner' : ''
        }`}
      >
        {/* Operador */}
        <td className="py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center border border-[#0f2a44]/10">
                <User size={18} className="text-[#0f2a44]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                <span className="text-[6px] text-white font-black">A</span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black text-[#0f2a44] leading-tight">
                {operator?.fullName || 'Staff No Identificado'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                ID: {operator?.employeeNumber || 'OPE-999'}
              </p>
            </div>
          </div>
        </td>

        {/* Activo */}
        <td className="py-6">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-[4px] bg-slate-50 flex items-center justify-center mb-2 border border-slate-100 relative group">
              <Truck size={24} className="text-slate-300" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                NO MEDIA
              </span>
            </div>
            <span className="text-[11px] font-black text-[#0f2a44] bg-[#0f2a44]/5 px-3 py-1 rounded-[4px]">
              {log.unit_id}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
              {unit?.marca} {unit?.modelo}
            </span>
          </div>
        </td>

        {/* Misión */}
        <td className="py-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Navigation size={12} className="text-emerald-500" />
              <span className="text-[12px] font-black text-[#0f2a44] tracking-tight">
                {log.origin}
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-40">
              <Clock size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">
                {formatDateTime(log.start_time)}
              </span>
              <ArrowRight size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">
                {log.destination}
              </span>
            </div>
          </div>
        </td>

        {/* Telemetría */}
        <td className="py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Gauge size={14} />
              <span className="text-[11px] font-black tracking-tight">
                {log.start_km?.toLocaleString() || '0'} KM
              </span>
            </div>
            {log.end_km !== null && log.end_km !== undefined && (
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={14} />
                <span className="text-[11px] font-black tracking-tight">
                  {log.end_km?.toLocaleString()} KM
                </span>
              </div>
            )}
          </div>
        </td>

        {/* Estado */}
        <td className="py-6">
          <div className="flex justify-center">
            <span
              className={`px-3 py-1.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}
            >
              {status.label}
            </span>
          </div>
        </td>

        {/* Ajustes */}
        <td className="py-6">
          <div className="flex items-center justify-center gap-2">
            {!log.end_time && (
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  onReport(log);
                }}
                className="p-2.5 rounded-[4px] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
                title="Reportar Incidencia"
              >
                <AlertTriangle size={18} />
              </button>
            )}
            <button
              onClick={(e): void => {
                e.stopPropagation();
                onEdit?.(log);
              }}
              className="p-2.5 rounded-[4px] bg-slate-50 text-[#0f2a44] hover:bg-[#0f2a44] hover:text-white transition-all duration-300"
              title="Ajustes de Ruta"
            >
              <Pencil size={18} />
            </button>
            {!log.end_time && (
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  onFinish(log);
                }}
                className="p-2.5 rounded-[4px] bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all duration-300"
                title="Finalizar Misión"
              >
                <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </td>
      </motion.tr>

      <tr className={isExpanded ? 'accordion-row-carrier' : ''}>
        <td colSpan={6} className="accordion-carrier">
          <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
            <div className="accordion-inner border-b border-[#0f2a44]/5">
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
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const handleToggle = (id: string): void => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

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
            {logs.map((log, index) => (
              <RouteLogRow
                key={log.uuid}
                log={log}
                index={index}
                isExpanded={expandedRowId === log.uuid}
                onToggle={(): void => handleToggle(log.uuid)}
                onEdit={onEdit}
                onReport={(l): void => setReportingRoute(l)}
                onFinish={(l): void => onEdit?.(l)}
              />
            ))}
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
