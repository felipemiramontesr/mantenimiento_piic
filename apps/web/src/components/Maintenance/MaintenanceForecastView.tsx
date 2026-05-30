import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Gauge,
  Zap,
} from 'lucide-react';
import { ForecastUrgency, MaintenanceForecastRow, ServiceType } from '../../types/maintenance';
import api from '../../api/client';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import AT from '../../styles/archonTypography';
import { useFleet } from '../../context/FleetContext';
import { useSovereignLayout, SearchSuggestion } from '../../context/SovereignLayoutContext';

const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'Básico 10K',
  INTERMEDIATE_20K: 'Intermedio 20K',
  MAJOR_30K: 'Mayor 30K - 40K',
  ADVANCED_50K: 'Avanzado 50K - 60K',
  MINOR_MINING: 'Menor — Mina',
};

const SERVICE_WEIGHT: Record<ServiceType, number> = {
  MINOR_MINING: 1,
  BASIC_10K: 2,
  INTERMEDIATE_20K: 3,
  MAJOR_30K: 4,
  ADVANCED_50K: 5,
};

const SERVICE_BADGE: Record<ServiceType, { bg: string; text: string; border: string }> = {
  BASIC_10K: { bg: 'bg-sky-500/10', text: 'text-sky-700', border: 'border-sky-500/20' },
  INTERMEDIATE_20K: { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/20' },
  MAJOR_30K: { bg: 'bg-violet-500/10', text: 'text-violet-700', border: 'border-violet-500/20' },
  ADVANCED_50K: { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-500/20' },
  MINOR_MINING: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
  },
};

type UrgencyMeta = {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

const URGENCY_META: Record<ForecastUrgency, UrgencyMeta> = {
  CRITICAL: {
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    border: 'border-red-500/20',
    icon: <AlertTriangle size={10} />,
    label: 'Crítico',
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    border: 'border-amber-400/30',
    icon: <Clock size={10} />,
    label: 'Próximo',
  },
  OK: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
    icon: <CheckCircle2 size={10} />,
    label: 'Al Día',
  },
};

const headers: ArchonTableHeader[] = [
  { key: 'unitId', label: 'UNIDAD', sortable: true, align: 'center', width: '15%' },
  { key: 'departamento', label: 'DEPTO', sortable: false, align: 'center', width: '7%' },
  { key: 'currentOdometer', label: 'ODÓMETRO', sortable: true, align: 'center', width: '12%' },
  { key: 'kmRemaining', label: 'KM RESTANTES', sortable: true, align: 'center', width: '11%' },
  {
    key: 'nextServiceDate',
    label: 'PRÓX. SERVICIO',
    sortable: true,
    align: 'center',
    width: '12%',
  },
  {
    key: 'projectedServiceType',
    label: 'TIPO PROYECTADO',
    sortable: true,
    align: 'center',
    width: '14%',
  },
  { key: 'urgency', label: 'URGENCIA', sortable: false, align: 'center', width: '13%' },
  { key: 'action', label: 'ACCIONES', sortable: false, align: 'center', width: '12%' },
];

type SortField = keyof MaintenanceForecastRow | null;

const kmRemainingColor = (km: number): string => {
  if (km <= 500) return 'text-red-600';
  if (km <= 2000) return 'text-amber-600';
  return 'text-[#0f2a44]';
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const daysColor = (days: number): string => {
  if (days <= 7) return 'text-red-500';
  if (days <= 30) return 'text-amber-600';
  return '';
};

const matchFieldInForecast = (
  row: MaintenanceForecastRow,
  query: string
): { label: string; value: string } | null => {
  if (row.unitId.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: row.unitId };
  }
  if (row.departamento && row.departamento.toLowerCase().includes(query)) {
    return { label: 'Depto', value: row.departamento };
  }
  const svcLabel = SERVICE_LABELS[row.projectedServiceType];
  if (svcLabel && svcLabel.toLowerCase().includes(query)) {
    return { label: 'Servicio', value: svcLabel };
  }
  return null;
};

interface MaintenanceForecastViewProps {
  onScheduleRequest: (unitId: string) => void;
}

const MaintenanceForecastView: React.FC<MaintenanceForecastViewProps> = ({ onScheduleRequest }) => {
  const { units } = useFleet();
  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const [data, setData] = useState<MaintenanceForecastRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: null,
    direction: 'asc',
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/maintenance/forecast')
      .then((res) => {
        if (res.data.success) setData(res.data.data as MaintenanceForecastRow[]);
      })
      .catch(() => setError('Error al recuperar pronósticos de mantenimiento.'))
      .finally(() => setLoading(false));
  }, []);

  // 🛡️ Dynamic Register for Universal Search Protocol
  useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, depto o tipo de servicio...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (data || [])
          .map((row): SearchSuggestion | null => {
            const match = matchFieldInForecast(row, query);
            if (!match) return null;
            return {
              id: row.unitId,
              title: row.unitId,
              subtitle: SERVICE_LABELS[row.projectedServiceType],
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: row,
            };
          })
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm(suggestion.title);
      },
    });

    return () => {
      setSearchConfig(null);
    };
  }, [data, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount
  useEffect(() => () => setSearchTerm(''), [setSearchTerm]);

  const handleSort = (key: string): void => {
    const field = key as keyof MaintenanceForecastRow;
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sorted = React.useMemo(() => {
    if (!sortConfig.field) return data;
    const f = sortConfig.field;
    return [...data].sort((a, b) => {
      const valA = f === 'projectedServiceType' ? SERVICE_WEIGHT[a.projectedServiceType] : a[f];
      const valB = f === 'projectedServiceType' ? SERVICE_WEIGHT[b.projectedServiceType] : b[f];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '');
      const strB = String(valB ?? '');
      return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortConfig]);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return sorted;
    const query = searchTerm.toLowerCase().trim();
    return sorted.filter((row) => matchFieldInForecast(row, query) !== null);
  }, [sorted, searchTerm]);

  if (error) return <div className="p-4 text-[#C12020] font-mono text-sm">{error}</div>;

  return (
    <div className="w-full text-pinnacle-navy">
      <ArchonDataTable
        loading={loading}
        loadingMessage="Calculando pronósticos de flotilla..."
        emptyMessage="NO SE ENCONTRARON UNIDADES ACTIVAS"
        data={filtered}
        headers={headers}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(row: MaintenanceForecastRow, index): React.JSX.Element => {
          const svcBadge = SERVICE_BADGE[row.projectedServiceType];
          const urgMeta = URGENCY_META[row.urgency];
          const unit = units.find((u) => u.id === row.unitId);
          return (
            <motion.tr
              key={row.unitId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="border-y border-solid border-slate-200/50 bg-transparent hover:bg-pinnacle-navy/[0.015] transition-colors duration-300"
            >
              {/* UNIDAD */}
              <td className="py-4 px-3 text-center">
                <div className="flex flex-col items-center">
                  {unit?.images?.[0] ? (
                    <img
                      src={unit.images[0]}
                      className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
                      alt={row.unitId}
                      onError={({ currentTarget }): void => {
                        currentTarget.setAttribute('src', '/img/archon-unit-placeholder.png');
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
                    {row.unitId}
                  </span>
                  <span className={AT.cellMeta}>
                    {row.marca} {row.modelo}
                  </span>
                </div>
              </td>

              {/* DEPTO */}
              <td className="py-4 px-3 text-center">
                <span
                  className={`${AT.statusBadge} bg-[#0f2a44]/5 text-[#0f2a44] border-[#0f2a44]/10`}
                >
                  {row.departamento}
                </span>
              </td>

              {/* ODÓMETRO */}
              <td className={`py-4 px-3 text-center ${AT.cellMono}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <Gauge size={11} className="text-[#0f2a44]/30 shrink-0" />
                  {row.currentOdometer.toLocaleString()} km
                </div>
                <p className={AT.cellMeta}>{row.dailyUsageAvg.toLocaleString()} km/día</p>
              </td>

              {/* KM RESTANTES */}
              <td className="py-4 px-3 text-center">
                <span
                  className={`font-mono text-[13px] font-bold ${kmRemainingColor(row.kmRemaining)}`}
                >
                  {row.kmRemaining.toLocaleString()} km
                </span>
                <p className={AT.cellMeta}>umbral: {row.nextKmReading.toLocaleString()} km</p>
              </td>

              {/* PRÓX. SERVICIO */}
              <td className="py-4 px-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Calendar size={11} className="text-[#0f2a44]/30 shrink-0" />
                  <span className={AT.cellValue}>{formatDate(row.nextServiceDate)}</span>
                </div>
                <p className={`${AT.cellMeta} ${daysColor(row.daysUntilService)}`}>
                  {row.daysUntilService} día{row.daysUntilService !== 1 ? 's' : ''}
                </p>
              </td>

              {/* TIPO PROYECTADO */}
              <td className="py-4 px-3 text-center">
                <span
                  className={`${AT.statusBadge} ${svcBadge.bg} ${svcBadge.text} ${svcBadge.border}`}
                >
                  {SERVICE_LABELS[row.projectedServiceType]}
                </span>
                <p className={AT.cellMeta}>odo: {row.projectedOdometer.toLocaleString()} km</p>
              </td>

              {/* URGENCIA */}
              <td className="py-4 px-3 text-center">
                <span
                  className={`${AT.statusBadge} ${urgMeta.bg} ${urgMeta.text} ${urgMeta.border}`}
                >
                  {urgMeta.icon}
                  {urgMeta.label}
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Zap size={8} className="text-[#0f2a44]/30 shrink-0" />
                  <span className={AT.cellMeta}>
                    {row.triggerType === 'KM' ? 'Kilometraje' : 'Fecha'}
                  </span>
                </div>
              </td>

              {/* ACCIONES */}
              <td className="py-4 px-3 text-center">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(): void => onScheduleRequest(row.unitId)}
                    title="Programar Servicio"
                    className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group"
                  >
                    <CalendarPlus
                      size={18}
                      className="transition-transform duration-300 group-hover:rotate-12"
                    />
                  </button>
                </div>
              </td>
            </motion.tr>
          );
        }}
      />
    </div>
  );
};

export default MaintenanceForecastView;
