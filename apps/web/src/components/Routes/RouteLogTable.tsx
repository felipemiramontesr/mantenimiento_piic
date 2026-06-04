import React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  ArrowRight,
  Gauge,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import AT from '../../styles/archonTypography';
import { formatDateTime, calculateDuration } from '../../utils/dateUtils';
import useRouteLogs from '../../hooks/useRouteLogs';
import IncidentReportForm from './IncidentReportForm';
import ForensicJournalTable from './ForensicJournalTable';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout, SearchSuggestion } from '../../context/SovereignLayoutContext';
import { UserIndustrial } from '../../types/user';
import { FleetUnit } from '../../types/fleet';

export interface RouteLog {
  id: string;
  uuid: string;
  unit_id: string;
  operator_id: string;
  origin: string;
  destination: string;
  destination_neighborhood_id?: number;
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
  incident_count?: number;
  origin_id?: number;
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

  // 🔱 Dynamic Refined Focus Border Class (Protocolo L Ruleset)
  const borderTopClass = isExpanded ? 'expanded-row-cell' : '';

  const consumedLiters = React.useMemo(() => {
    if (!log.end_time) return null;
    const tankCap = unit?.fuelTankCapacity || 0;
    if (tankCap <= 0) return null;
    const startPct = Number(log.fuel_level_start || 0);
    const endPct = Number(log.fuel_level_end ?? log.fuel_level_start ?? 100);
    const loadedLiters = Number(log.fuel_liters_loaded || 0);

    const startLiters = (startPct / 100) * tankCap;
    const endLiters = (endPct / 100) * tankCap;

    const consumed = startLiters - endLiters + loadedLiters;
    return Math.max(0, consumed);
  }, [
    log.end_time,
    log.fuel_level_start,
    log.fuel_level_end,
    log.fuel_liters_loaded,
    unit?.fuelTankCapacity,
  ]);

  const kmPerLiter = React.useMemo(() => {
    if (log.end_km === null || log.end_km === undefined || !consumedLiters || consumedLiters <= 0)
      return null;
    const distance = log.end_km - log.start_km;
    if (distance <= 0) return null;
    return distance / consumedLiters;
  }, [log.end_km, log.start_km, consumedLiters]);

  const costPerKm = React.useMemo(() => {
    if (
      log.end_km === null ||
      log.end_km === undefined ||
      log.fuel_amount === null ||
      log.fuel_amount === undefined
    )
      return null;
    const distance = log.end_km - log.start_km;
    if (distance <= 0) return null;
    return log.fuel_amount / distance;
  }, [log.end_km, log.start_km, log.fuel_amount]);

  const getStatus = (l: RouteLog): { label: string; color: string; bg: string; border: string } => {
    if (l.incident_count && l.incident_count > 0) {
      return {
        label: l.end_time ? 'FINALIZADA' : 'EN RUTA',
        color: 'text-[#ef4444]',
        bg: 'bg-[#ef444415]',
        border: 'border-[#ef4444]/25',
      };
    }
    if (!l.end_time) {
      return {
        label: 'EN RUTA',
        color: 'text-[#3b82f6]',
        bg: 'bg-[#3b82f615]',
        border: 'border-[#3b82f6]/25',
      };
    }
    return {
      label: 'FINALIZADA',
      color: 'text-[#10b981]',
      bg: 'bg-[#10b98115]',
      border: 'border-[#10b981]/25',
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
        className={`${isExpanded ? 'expanded-focus-sovereign' : ''} ${
          log.incident_count && log.incident_count > 0 ? 'route-incident-row' : ''
        } bg-transparent border-y border-solid border-slate-200/50 hover:bg-slate-50/50 transition-all duration-300 cursor-pointer`}
      >
        {/* Activo */}
        <td className={`py-4 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            {unit?.images?.[0] ? (
              <img
                src={unit.images[0]}
                className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
                alt={log.unit_id}
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                  const imgElement = e.currentTarget;
                  imgElement.src = '/img/archon-unit-placeholder.png';
                }}
              />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-[4px] bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-2 overflow-hidden">
                <img
                  src="/img/archon-unit-placeholder.png"
                  alt="Archon Unit Placeholder"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px]">
              {log.unit_id}
            </span>
            <span className={`${AT.idBadge} mt-1`}>RT-{String(log.id).padStart(5, '0')}</span>
            <span className={AT.cellMeta}>
              {unit?.marca} {unit?.modelo}
            </span>
          </div>
        </td>

        {/* Operador */}
        <td className={`py-4 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center border border-[#0f2a44]/10 overflow-hidden relative">
                <User size={18} className="text-[#0f2a44]" />
                {operator?.imageUrl && (
                  <img
                    src={operator.imageUrl}
                    className="absolute inset-0 w-full h-full rounded-full object-cover"
                    alt={operator.fullName || 'Operator'}
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                      const imgElement = e.currentTarget;
                      imgElement.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                <span className="text-[6px] text-white font-black">A</span>
              </div>
            </div>
            <span
              className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px] text-center"
              title={operator?.fullName || 'Staff No Identificado'}
            >
              {operator?.fullName || 'Staff No Identificado'}
            </span>
            <span className={AT.cellMeta}>ID: {operator?.employeeNumber || 'OPE-999'}</span>
          </div>
        </td>

        {/* Misión */}
        <td className={`py-6 text-center ${borderTopClass}`}>
          <div className="flex flex-col items-center gap-1 px-4">
            {/* SALIDA RECORD */}
            <div className="w-full flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-archon-base font-black text-emerald-500 uppercase tracking-tighter w-[45px]">
                  Salida:
                </span>
                <div className="flex items-center gap-2">
                  <Clock size={10} className="text-[#0f2a44] opacity-30" />
                  <span className="text-archon-base font-bold text-[#0f2a44]">
                    {formatDateTime(log.start_time)}
                  </span>
                  <span className="text-archon-base font-black text-[#0f2a44] opacity-40">—</span>
                  <span className="text-archon-base font-black text-[#0f2a44] uppercase tracking-tighter">
                    {unit?.sede || 'BASE'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 pl-[53px] w-full">
                <ArrowRight size={10} className="text-emerald-500 mt-0.5 shrink-0 opacity-40" />
                <span className="text-archon-base font-bold text-emerald-600 uppercase tracking-tighter break-words text-left leading-relaxed w-full pr-4">
                  {log.destination}
                </span>
              </div>
            </div>

            {/* LLEGADA RECORD */}
            {log.end_time && (
              <>
                <div className="w-full flex flex-col items-center gap-1 mt-1.5 border-t border-[#0f2a44]/5 pt-1.5">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-archon-base font-black text-blue-500 uppercase tracking-tighter w-[45px]">
                      Llegada:
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock size={10} className="text-[#0f2a44] opacity-30" />
                      <span className="text-archon-base font-bold text-[#0f2a44]">
                        {formatDateTime(log.end_time)}
                      </span>
                      <span className="text-archon-base font-black text-[#0f2a44] opacity-40">
                        —
                      </span>
                      <span className="text-archon-base font-black text-[#0f2a44] uppercase tracking-tighter opacity-70">
                        {unit?.sede || 'BASE'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pl-[53px] w-full">
                    <ArrowRight
                      size={10}
                      className="text-blue-500 mt-0.5 shrink-0 opacity-40 rotate-180"
                    />
                    <span className="text-archon-base font-bold text-[#0f2a44] uppercase tracking-tighter opacity-80 break-words text-left leading-relaxed w-full pr-4">
                      {log.destination}
                    </span>
                  </div>
                </div>

                {/* TIEMPO TOTAL */}
                <div className="flex items-center gap-2 mt-2 pl-[53px]">
                  <span className="text-archon-sm font-black text-[#0f2a44] uppercase tracking-widest opacity-40">
                    Tiempo Total:
                  </span>
                  <span className="text-archon-base font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {calculateDuration(log.start_time, log.end_time)}
                  </span>
                </div>
              </>
            )}
          </div>
        </td>

        {/* Telemetría */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Gauge size={14} />
              <span className="text-archon-md font-black tracking-tight">
                {log.start_km?.toLocaleString() || '0'} KM
              </span>
            </div>
            {log.end_km !== null && log.end_km !== undefined && (
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={14} />
                <span className="text-archon-md font-black tracking-tight">
                  {log.end_km?.toLocaleString()} KM
                </span>
              </div>
            )}
          </div>
        </td>

        {/* Combustible */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            {((): React.JSX.Element => {
              const currentPercent = log.end_time ? log.fuel_level_end : log.fuel_level_start;
              const tankCap = unit?.fuelTankCapacity || 0;
              const realLiters = tankCap > 0 ? (tankCap * (currentPercent || 0)) / 100 : null;

              return (
                <>
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    <Fuel size={14} />
                    <span className="text-archon-md font-black tracking-tight">
                      {currentPercent?.toLocaleString(undefined, { minimumFractionDigits: 1 })}%
                    </span>
                  </div>
                  {realLiters !== null && (
                    <span className="text-archon-base font-black text-[#0f2a44] mt-1 opacity-80">
                      {realLiters.toLocaleString(undefined, { minimumFractionDigits: 1 })} L
                    </span>
                  )}
                  <span className="text-archon-xs font-bold text-slate-400 uppercase mt-0.5">
                    {log.end_time ? 'LECTURA FINAL' : 'PUNTO PARTIDA'}
                  </span>
                </>
              );
            })()}
          </div>
        </td>

        {/* Delta */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            {log.end_km !== null && log.end_km !== undefined ? (
              ((): React.JSX.Element => {
                const delta = log.end_km - log.start_km;
                const isNegative = delta < 0;
                return (
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      isNegative ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
                    }`}
                  >
                    {!isNegative && (
                      <span className="text-archon-base font-black tracking-widest">+</span>
                    )}
                    <span className="text-archon-md font-black tracking-tight">
                      {delta.toLocaleString()}
                    </span>
                    <span className="text-archon-xs font-bold opacity-60 ml-0.5">KM</span>
                  </div>
                );
              })()
            ) : (
              <span className={AT.cellValueMuted}>---</span>
            )}
          </div>
        </td>

        {/* Consumo */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            {consumedLiters !== null ? (
              <>
                <div className="flex items-center gap-1 text-[#0f2a44] bg-[#0f2a44]/5 px-3 py-1 rounded-full border border-[#0f2a44]/10">
                  <span className="text-archon-md font-black tracking-tight">
                    {consumedLiters.toFixed(1)}
                  </span>
                  <span className="text-archon-xs font-bold opacity-60 ml-0.5">L</span>
                </div>
                {kmPerLiter !== null && (
                  <span className="text-archon-base font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    {kmPerLiter.toFixed(2)} KM/L
                  </span>
                )}
              </>
            ) : (
              <span className={AT.cellValueMuted}>---</span>
            )}
          </div>
        </td>

        {/* Costo */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center">
            {log.end_time ? (
              <>
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <span className="text-archon-base font-black opacity-70">$</span>
                  <span className="text-archon-md font-black tracking-tight">
                    {Number(log.fuel_amount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {costPerKm !== null && (
                  <span className="text-archon-base font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    ${costPerKm.toFixed(2)}/KM
                  </span>
                )}
              </>
            ) : (
              <span className={AT.cellValueMuted}>---</span>
            )}
          </div>
        </td>

        {/* Estado */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex justify-center">
            <span
              className={`px-3 py-1.5 rounded-[4px] text-archon-sm font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}
            >
              {status.label}
            </span>
          </div>
        </td>

        {/* Ajustes */}
        <td className={`py-6 ${borderTopClass}`}>
          <div className="flex flex-col items-center gap-2">
            <Link
              to={`/dashboard/routes/${log.uuid}`}
              title="Ver nodo de ruta"
              className="flex items-center justify-center w-10 h-10 text-[#0f2a44] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] group"
              onClick={(e): void => e.stopPropagation()}
            >
              <ExternalLink
                size={16}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
            {!log.end_time && (
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  onReport(log);
                }}
                className="p-2.5 rounded-[4px] bg-[#0f2a44] text-white"
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
              className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group"
              title="Editar Ruta"
            >
              <Pencil
                size={18}
                className="transition-transform duration-300 group-hover:rotate-12"
              />
            </button>
            {!log.end_time && (
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  onFinish(log);
                }}
                className="p-2.5 rounded-[4px] bg-[#0f2a44] text-white"
                title="Finalizar Misión"
              >
                <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </td>
      </motion.tr>

      <tr className={isExpanded ? 'accordion-row-carrier' : ''}>
        <td
          colSpan={10}
          className={`accordion-carrier !p-0 !m-0 ${
            isExpanded ? 'expanded-accordion-carrier' : ''
          }`}
        >
          <div className={`accordion-content ${isExpanded ? 'expanded' : ''} !bg-transparent`}>
            <div className="accordion-inner !p-0 !m-0">
              {isExpanded && (
                <ForensicJournalTable unitId={log.unit_id} routeUuid={log.uuid} hideHeader />
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};

const matchOperator = (
  operator: UserIndustrial | undefined,
  query: string
): { label: string; value: string } | null => {
  if (!operator) return null;
  if (operator.fullName?.toLowerCase().includes(query)) {
    return { label: 'Operador', value: operator.fullName };
  }
  if (operator.employeeNumber?.toLowerCase().includes(query)) {
    return { label: 'No. Operador', value: operator.employeeNumber };
  }
  return null;
};

const matchUnitDetails = (
  unit: FleetUnit | undefined,
  query: string
): { label: string; value: string } | null => {
  if (!unit) return null;
  if (unit.marca?.toLowerCase().includes(query)) {
    return { label: 'Marca', value: unit.marca };
  }
  if (unit.modelo?.toLowerCase().includes(query)) {
    return { label: 'Modelo', value: unit.modelo };
  }
  if (unit.sede?.toLowerCase().includes(query)) {
    return { label: 'Sede', value: unit.sede };
  }
  return null;
};

const matchFieldInRoute = (
  log: RouteLog,
  query: string,
  users: UserIndustrial[],
  units: FleetUnit[]
): { label: string; value: string } | null => {
  if (log.unit_id?.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: log.unit_id };
  }
  const operator = users.find((u) => u.id === String(log.operator_id));
  const operatorMatch = matchOperator(operator, query);
  if (operatorMatch) return operatorMatch;

  if (log.origin?.toLowerCase().includes(query)) {
    return { label: 'Origen', value: log.origin };
  }
  if (log.destination?.toLowerCase().includes(query)) {
    return { label: 'Destino', value: log.destination };
  }
  if (log.description?.toLowerCase().includes(query)) {
    return { label: 'Misión', value: log.description };
  }
  const unit = units.find((u) => u.id === log.unit_id);
  const unitMatch = matchUnitDetails(unit, query);
  if (unitMatch) return unitMatch;

  return null;
};

const RouteLogTable: React.FC<RouteLogTableProps> = ({ onEdit }) => {
  const { logs, isSyncing, refresh } = useRouteLogs();
  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const { users } = useUsers();
  const { units } = useFleet();
  const [reportingRoute, setReportingRoute] = React.useState<RouteLog | null>(null);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{
    field: string | null;
    direction: 'asc' | 'desc';
  }>({
    field: null,
    direction: 'asc',
  });

  const handleSort = (key: string): void => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.field === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ field: key, direction });
  };

  // 🛡️ Dynamic Register for Universal Search Protocol (DRY Compliant)
  React.useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, operador, origen, destino o marca...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (logs || [])
          .map((log): SearchSuggestion | null => {
            const match = matchFieldInRoute(log, query, users, units);
            if (!match) return null;
            const operator = users.find((u) => u.id === String(log.operator_id));
            return {
              id: log.uuid,
              title: `${log.unit_id} ➔ ${log.destination}`,
              subtitle: operator?.fullName || 'Operador General',
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: log,
            };
          })
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm((suggestion.rawItem as RouteLog).unit_id);
      },
    });

    return () => {
      setSearchConfig(null);
    };
  }, [logs, users, units, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount (Resilience Protocol)
  React.useEffect(() => () => setSearchTerm(''), [setSearchTerm]);

  const filteredLogs = React.useMemo(() => {
    let result = logs;
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = logs.filter((log) => {
        if (log.uuid?.toLowerCase() === query) return true;
        return matchFieldInRoute(log, query, users, units) !== null;
      });
    }

    if (sortConfig.field === 'activo') {
      result = [...result].sort((a, b) => {
        const idA = Number(a.id || 0);
        const idB = Number(b.id || 0);
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      });
    }

    if (sortConfig.field === 'estado') {
      result = [...result].sort((a, b) => {
        const labelA = a.end_time ? 'FINALIZADA' : 'EN RUTA';
        const labelB = b.end_time ? 'FINALIZADA' : 'EN RUTA';
        return sortConfig.direction === 'asc'
          ? labelA.localeCompare(labelB)
          : labelB.localeCompare(labelA);
      });
    }

    if (sortConfig.field === 'mision') {
      result = [...result].sort((a, b) => {
        const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
        const timeA = Number.isNaN(dateA) ? 0 : dateA;
        const timeB = Number.isNaN(dateB) ? 0 : dateB;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }

    return result;
  }, [logs, searchTerm, users, units, sortConfig]);

  const handleToggle = (id: string): void => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const headers: ArchonTableHeader[] = [
    { key: 'activo', label: 'UNIDAD', width: '9%', sortable: true },
    { key: 'operador', label: 'OPERADOR', width: '10%' },
    { key: 'mision', label: 'MISIÓN / TRAYECTO', width: '26%', sortable: true },
    { key: 'telemetria', label: 'TELEMETRÍA', width: '8%' },
    { key: 'combustible', label: 'COMBUSTIBLE', width: '9%' },
    { key: 'delta', label: 'DELTA', width: '6%' },
    { key: 'consumo', label: 'CONSUMO', width: '8%' },
    { key: 'costo', label: 'COSTO TOTAL', width: '8%' },
    { key: 'estado', label: 'ESTADO', width: '8%', sortable: true },
    { key: 'ajustes', label: 'ACCIONES', width: '8%' },
  ];

  if (reportingRoute) {
    return (
      <div className="card-archon-sovereign bg-white !p-0 overflow-x-auto custom-scrollbar animate-in fade-in duration-700 relative">
        <IncidentReportForm
          routeUuid={reportingRoute.uuid}
          unitId={reportingRoute.unit_id}
          onClose={(): void => setReportingRoute(null)}
          onSuccess={(): void => {
            setReportingRoute(null);
            refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {isSyncing && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-archon-xs font-black uppercase tracking-widest text-[#0f2a44] opacity-30">
            Syncing
          </span>
        </div>
      )}
      <ArchonDataTable
        testId="archon-route-log-table"
        loading={isSyncing && logs.length === 0}
        loadingMessage="Sincronizando Rutas..."
        data={filteredLogs}
        headers={headers}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(log, index): React.ReactNode => (
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
        )}
      />
    </div>
  );
};

export default RouteLogTable;
