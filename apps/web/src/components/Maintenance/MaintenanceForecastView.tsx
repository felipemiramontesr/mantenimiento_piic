import React from 'react';
import { MaintenanceForecastRow } from '../../types/maintenance';
import ArchonDataTable from '../UI/ArchonDataTable';
import { useFleet } from '../../context/FleetContext';
import { headers } from './MaintenanceForecastView/constants';
import { useMaintenanceForecastState } from './MaintenanceForecastView/useForecastState';
import { ForecastRow } from './MaintenanceForecastView/ForecastRow';

interface MaintenanceForecastViewProps {
  onScheduleRequest: (unitId: string) => void;
}

/**
 * 🔱 Pronóstico de mantenimiento — orquestador (FC165 F3 Slice3.3 Lote A,
 * Dual-Gate Isolation: estado/lógica en `MaintenanceForecastView/`).
 */
const MaintenanceForecastView: React.FC<MaintenanceForecastViewProps> = ({ onScheduleRequest }) => {
  const { units } = useFleet();
  const { filtered, loading, error, sortConfig, handleSort } = useMaintenanceForecastState();

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
        renderRow={(row: MaintenanceForecastRow, index): React.JSX.Element => (
          <ForecastRow
            key={row.unitId}
            row={row}
            index={index}
            unit={units.find((u) => u.id === row.unitId)}
            onScheduleRequest={onScheduleRequest}
          />
        )}
      />
    </div>
  );
};

export default MaintenanceForecastView;
