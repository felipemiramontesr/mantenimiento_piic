import React from 'react';
import { MaintenanceLog } from '../../types/maintenance';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { MaintenanceGridViewProps } from './MaintenanceGridView/types';
import { useMaintenanceLogsFetch } from './MaintenanceGridView/useMaintenanceLogsFetch';
import { useMaintenanceLogSort } from './MaintenanceGridView/useMaintenanceLogSort';
import { useMaintenanceLogSearch } from './MaintenanceGridView/useMaintenanceLogSearch';
import MaintenanceLogRow from './MaintenanceGridView/MaintenanceLogRow';

export type { MaintenanceLog };

const HEADERS: ArchonTableHeader[] = [
  { key: 'activo', label: 'UNIDAD', sortable: true, align: 'center', width: '17%' },
  { key: 'tecnico', label: 'TÉCNICO', sortable: false, align: 'center', width: '16%' },
  { key: 'service_type', label: 'TIPO SERVICIO', sortable: true, align: 'center', width: '12%' },
  {
    key: 'odometer_at_service',
    label: 'ODÓMETRO',
    sortable: true,
    align: 'center',
    width: '11%',
  },
  { key: 'service_date', label: 'FECHAS', sortable: true, align: 'center', width: '22%' },
  { key: 'cost', label: 'COSTO', sortable: true, align: 'center', width: '11%' },
  { key: 'accion', label: 'ACCIONES', sortable: false, align: 'center', width: '11%' },
];

/** Grid de mantenimiento: orquesta fetch, orden/filtro y búsqueda (FC165 F2 Slice 2.1B). */
const MaintenanceGridView: React.FC<MaintenanceGridViewProps> = ({
  refreshTrigger,
  onCompleteRequest,
  onDetailRequest,
  onAcceptOrder,
  onRejectOrder,
  onOpenUpa,
}) => {
  const { searchTerm } = useSovereignLayout();
  const { logs, loading, error } = useMaintenanceLogsFetch(refreshTrigger);
  useMaintenanceLogSearch(logs);
  const { sortConfig, handleSort, filteredLogs } = useMaintenanceLogSort(logs, searchTerm);

  if (error) return <div className="p-4 text-[#C12020] font-mono text-sm">{error}</div>;

  return (
    <div className="w-full text-pinnacle-navy">
      <ArchonDataTable
        loading={loading}
        loadingMessage="Sincronizando Mantenimientos..."
        emptyMessage="NO SE ENCONTRARON REGISTROS"
        data={filteredLogs}
        headers={HEADERS}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(log: MaintenanceLog, index): React.ReactNode => (
          <MaintenanceLogRow
            key={log.id}
            log={log}
            index={index}
            onCompleteRequest={onCompleteRequest}
            onDetailRequest={onDetailRequest}
            onAcceptOrder={onAcceptOrder}
            onRejectOrder={onRejectOrder}
            onOpenUpa={onOpenUpa}
          />
        )}
      />
    </div>
  );
};

export default MaintenanceGridView;
