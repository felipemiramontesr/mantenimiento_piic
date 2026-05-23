import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { MaintenanceLog } from '../../types/maintenance';
import api from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout, SearchSuggestion } from '../../context/SovereignLayoutContext';

interface MaintenanceGridViewProps {
  refreshTrigger: number;
  onNewRequest: () => void;
}

const matchFieldInMaintenance = (
  log: MaintenanceLog,
  query: string
): { label: string; value: string } | null => {
  if (log.id.toString().includes(query)) {
    return { label: 'ID', value: `#${log.id}` };
  }
  if (log.unit_id.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: log.unit_id };
  }
  if (log.placas?.toLowerCase().includes(query)) {
    return { label: 'Placas', value: log.placas };
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
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const [sortConfig, setSortConfig] = useState<{
    field:
      | 'id'
      | 'unit_id'
      | 'service_type'
      | 'odometer_at_service'
      | 'service_date'
      | 'cost'
      | null;
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
      | 'id'
      | 'unit_id'
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

      if (sortConfig.field === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortConfig.field === 'unit_id') {
        valA = a.unit_id;
        valB = b.unit_id;
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
    { key: 'id', label: 'ID', sortable: true, width: '100px', align: 'center' },
    { key: 'unit_id', label: 'UNIDAD', sortable: true, align: 'center' },
    { key: 'service_type', label: 'TIPO SERVICIO', sortable: true, align: 'center' },
    { key: 'odometer_at_service', label: 'ODÓMETRO', sortable: true, align: 'center' },
    { key: 'service_date', label: 'FECHA', sortable: true, align: 'center' },
    { key: 'cost', label: 'COSTO', sortable: true, align: 'center' },
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
        renderRow={(log: MaintenanceLog, index): React.JSX.Element => (
          <motion.tr
            key={log.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="bg-transparent hover:bg-pinnacle-navy/[0.015] border-y border-solid border-slate-200/50 transition-colors"
          >
            <td className="py-4 px-3 font-mono text-xs opacity-60 text-center">#{log.id}</td>
            <td className="py-4 px-3 text-center">
              <div className="font-black text-center">{log.unit_id}</div>
              <div className="text-[10px] opacity-60 uppercase text-center">{log.placas}</div>
            </td>
            <td className="py-4 px-3 text-center">
              {log.service_type === 'MINOR_MINING' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 text-xs font-bold border border-emerald-500/20">
                  Mina Menor
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-pinnacle-navy/10 text-pinnacle-navy text-xs font-bold border border-pinnacle-navy/20">
                  Preventivo
                </span>
              )}
            </td>
            <td className="py-4 px-3 font-mono text-xs text-center">
              {Number(log.odometer_at_service).toLocaleString()} km
            </td>
            <td className="py-4 px-3 whitespace-nowrap text-center">
              {formatDate(log.service_date)}
            </td>
            <td className="py-4 px-3 text-center font-mono font-black text-emerald-700">
              {`$${Number(log.cost).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </td>
          </motion.tr>
        )}
      />
    </div>
  );
};

export default MaintenanceGridView;
