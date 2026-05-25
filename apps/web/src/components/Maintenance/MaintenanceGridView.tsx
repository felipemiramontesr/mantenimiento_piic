import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

import { MaintenanceLog } from '../../types/maintenance';
import api from '../../api/client';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import { formatDate } from '../../utils/dateUtils';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout, SearchSuggestion } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

interface MaintenanceGridViewProps {
  refreshTrigger: number;
  onNewRequest: () => void;
}

const matchFieldInMaintenance = (
  log: MaintenanceLog,
  query: string
): { label: string; value: string } | null => {
  if (log.unit_id.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: log.unit_id };
  }
  if (log.technician.toLowerCase().includes(query)) {
    return { label: 'Técnico', value: log.technician };
  }
  if (log.service_type.toLowerCase().includes(query)) {
    return {
      label: 'Tipo',
      value: log.service_type === 'MINOR_MINING' ? 'Mina Menor' : 'Preventivo',
    };
  }
  return null;
};

const MaintenanceGridView: React.FC<MaintenanceGridViewProps> = ({
  refreshTrigger,
  onNewRequest: _onNewRequest,
}) => {
  const { units } = useFleet();
  const { users } = useUsers();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const [sortConfig, setSortConfig] = useState<{
    field: 'activo' | 'service_type' | 'odometer_at_service' | 'service_date' | 'cost' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  // 🛡️ Dynamic Register for Universal Search Protocol (DRY Compliant)
  useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, placas o tipo de servicio...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (logs || [])
          .map((log): SearchSuggestion | null => {
            const match = matchFieldInMaintenance(log, query);
            if (!match) return null;
            return {
              id: log.id.toString(),
              title: log.unit_id,
              subtitle: log.service_type === 'MINOR_MINING' ? 'Mina Menor' : 'Preventivo',
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: log,
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
  }, [logs, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount (Resilience Protocol)
  useEffect(() => () => setSearchTerm(''), [setSearchTerm]);

  useEffect(() => {
    const fetchLogs = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await api.get('/maintenance?limit=50');
        if (response.data.success) {
          setLogs(response.data.data);
        }
      } catch (err) {
        setError('Error al recuperar registros de mantenimiento.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [refreshTrigger]);

  const handleSort = (key: string): void => {
    const field = key as
      | 'activo'
      | 'service_type'
      | 'odometer_at_service'
      | 'service_date'
      | 'cost';
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedLogs = React.useMemo(() => {
    const data = [...logs];
    if (!sortConfig.field) return data;

    return data.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortConfig.field === 'activo') {
        valA = a.id;
        valB = b.id;
      } else if (sortConfig.field === 'service_type') {
        valA = a.service_type;
        valB = b.service_type;
      } else if (sortConfig.field === 'odometer_at_service') {
        valA = Number(a.odometer_at_service || 0);
        valB = Number(b.odometer_at_service || 0);
      } else if (sortConfig.field === 'service_date') {
        valA = new Date(a.service_date).getTime();
        valB = new Date(b.service_date).getTime();
      } else if (sortConfig.field === 'cost') {
        valA = Number(a.cost || 0);
        valB = Number(b.cost || 0);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [logs, sortConfig]);

  const filteredLogs = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedLogs;
    const query = searchTerm.toLowerCase().trim();
    return sortedLogs.filter((log) => matchFieldInMaintenance(log, query) !== null);
  }, [sortedLogs, searchTerm]);

  if (error) return <div className="p-4 text-[#C12020] font-mono text-sm">{error}</div>;

  const headers: ArchonTableHeader[] = [
    { key: 'activo', label: 'UNIDAD', sortable: true, align: 'center', width: '20%' },
    { key: 'tecnico', label: 'TÉCNICO', sortable: false, align: 'center', width: '20%' },
    { key: 'service_type', label: 'TIPO SERVICIO', sortable: true, align: 'center', width: '15%' },
    {
      key: 'odometer_at_service',
      label: 'ODÓMETRO',
      sortable: true,
      align: 'center',
      width: '15%',
    },
    { key: 'service_date', label: 'FECHA', sortable: true, align: 'center', width: '15%' },
    { key: 'cost', label: 'COSTO', sortable: true, align: 'center', width: '15%' },
  ];

  return (
    <div className="w-full text-pinnacle-navy">
      <ArchonDataTable
        loading={loading}
        loadingMessage="Sincronizando Mantenimientos..."
        emptyMessage="NO SE ENCONTRARON REGISTROS"
        data={filteredLogs}
        headers={headers}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(log: MaintenanceLog, index): React.JSX.Element => {
          const unit = units.find((u) => u.id === log.unit_id);
          const technician = users.find(
            (u) => u.fullName === log.technician || u.username === log.technician
          );
          return (
            <motion.tr
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-transparent hover:bg-pinnacle-navy/[0.015] border-y border-solid border-slate-200/50 transition-colors"
            >
              <td className="py-4 px-3">
                <div className="flex flex-col items-center">
                  {unit?.images?.[0] ? (
                    <img
                      src={unit.images[0]}
                      className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
                      alt={log.unit_id}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                        const img = e.currentTarget;
                        img.src = '/img/archon-unit-placeholder.png';
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
                  <span className={`${AT.idBadge} mt-1`}>
                    MNT-{String(log.id).padStart(5, '0')}
                  </span>
                  <span className={AT.cellMeta}>
                    {unit?.marca} {unit?.modelo}
                  </span>
                </div>
              </td>
              <td className="py-4 px-3">
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center border border-[#0f2a44]/10 overflow-hidden relative">
                      <User size={18} className="text-[#0f2a44]" />
                      {technician?.imageUrl && (
                        <img
                          src={technician.imageUrl}
                          className="absolute inset-0 w-full h-full rounded-full object-cover"
                          alt={technician.fullName || 'Técnico'}
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
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
                    title={technician?.fullName || log.technician || 'Staff No Identificado'}
                  >
                    {technician?.fullName || log.technician || 'Staff No Identificado'}
                  </span>
                  <span className={AT.cellMeta}>ID: {technician?.employeeNumber || 'TEC-000'}</span>
                </div>
              </td>
              <td className="py-4 px-3 text-center">
                {log.service_type === 'MINOR_MINING' ? (
                  <span
                    className={`${AT.statusBadge} bg-emerald-500/10 text-emerald-700 border-emerald-500/20`}
                  >
                    Mina Menor
                  </span>
                ) : (
                  <span
                    className={`${AT.statusBadge} bg-pinnacle-navy/10 text-pinnacle-navy border-pinnacle-navy/20`}
                  >
                    Preventivo
                  </span>
                )}
              </td>
              <td className={`py-4 px-3 text-center ${AT.cellMono}`}>
                {Number(log.odometer_at_service).toLocaleString()} km
              </td>
              <td className={`py-4 px-3 whitespace-nowrap text-center ${AT.cellValue}`}>
                {formatDate(log.service_date)}
              </td>
              <td className={`py-4 px-3 text-center ${AT.cellMono} text-emerald-700`}>
                {`$${Number(log.cost).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              </td>
            </motion.tr>
          );
        }}
      />
    </div>
  );
};

export default MaintenanceGridView;
