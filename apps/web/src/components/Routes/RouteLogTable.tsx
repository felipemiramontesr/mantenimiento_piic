import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import useRouteLogs from '../../hooks/useRouteLogs';
import IncidentReportForm from './IncidentReportForm';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { RouteLogTableProps, RouteLog } from './RouteLogTable/types';
import { useRouteLogSearch } from './RouteLogTable/useRouteLogSearch';
import { useRouteLogSort } from './RouteLogTable/useRouteLogSort';
import RouteLogRow from './RouteLogTable/RouteLogRow';

export type { RouteLog };

const TABLE_HEADERS: ArchonTableHeader[] = [
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

interface SyncIndicatorProps {
  visible: boolean;
}

/** Indicador de sincronización en curso (esquina superior derecha) (FC163 F2B4 Sub-Batch 4B-2). */
function SyncIndicator({ visible }: SyncIndicatorProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      <span className="text-archon-xs font-black uppercase tracking-widest text-[#0f2a44] opacity-30">
        Syncing
      </span>
    </div>
  );
}

interface IncidentReportPanelProps {
  route: RouteLog;
  onClose: () => void;
  onSuccess: () => void;
}

/** Panel de reporte de incidencia, reemplaza la tabla mientras está activo (FC163 F2B4 Sub-Batch 4B-2). */
function IncidentReportPanel({
  route,
  onClose,
  onSuccess,
}: IncidentReportPanelProps): React.ReactElement {
  return (
    <div className="card-archon-sovereign bg-white !p-0 overflow-x-auto custom-scrollbar animate-in fade-in duration-700 relative">
      <IncidentReportForm
        routeUuid={route.uuid}
        unitId={route.unit_id}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}

const RouteLogTable: React.FC<RouteLogTableProps> = ({ onEdit }) => {
  const { logs, isSyncing, refresh } = useRouteLogs();
  const { searchTerm } = useSovereignLayout();
  const { users } = useUsers();
  const { units } = useFleet();
  const [reportingRoute, setReportingRoute] = React.useState<RouteLog | null>(null);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  useRouteLogSearch(logs, users, units);
  const { sortConfig, handleSort, filteredLogs } = useRouteLogSort(logs, searchTerm, users, units);

  const handleToggle = (id: string): void => setExpandedRowId(expandedRowId === id ? null : id);

  const handleReportSuccess = (): void => {
    setReportingRoute(null);
    refresh();
  };

  if (reportingRoute) {
    return (
      <IncidentReportPanel
        route={reportingRoute}
        onClose={(): void => setReportingRoute(null)}
        onSuccess={handleReportSuccess}
      />
    );
  }

  return (
    <div className="relative">
      <SyncIndicator visible={isSyncing} />
      <ArchonDataTable
        testId="archon-route-log-table"
        loading={isSyncing && logs.length === 0}
        loadingMessage="Sincronizando Rutas..."
        data={filteredLogs}
        headers={TABLE_HEADERS}
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
