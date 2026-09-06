import React from 'react';
import { useUsers } from '../../context/UserContext';
import { MAINTENANCE } from '../../constants/maintenance';
import { useRegistrationState } from './MaintenanceRegistrationForm/useRegistrationState';
import { inputClass } from './MaintenanceRegistrationForm/constants';
import ModeBanner from './MaintenanceRegistrationForm/ModeBanner';
import ConfigPanel from './MaintenanceRegistrationForm/ConfigPanel';
import OperationalPanel from './MaintenanceRegistrationForm/OperationalPanel';
import UpaPreviewSection from './MaintenanceRegistrationForm/UpaPreviewSection';
import FuelSection from './MaintenanceRegistrationForm/FuelSection';
import ActionBar from './MaintenanceRegistrationForm/ActionBar';

interface MaintenanceRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialUnitId?: string;
}

/**
 * 🔱 Registro de servicio de mantenimiento — orquestador (FC165 F3 Slice3.3
 * Lote A, Dual-Gate Isolation: estado/lógica y secciones en
 * `MaintenanceRegistrationForm/`).
 */
const MaintenanceRegistrationForm: React.FC<MaintenanceRegistrationFormProps> = ({
  onSuccess,
  onCancel,
  initialUnitId,
}) => {
  const { users } = useUsers();
  const state = useRegistrationState(
    initialUnitId,
    users,
    MAINTENANCE.MINE_UNIT_INTERVAL_KM,
    MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM,
    onSuccess
  );

  return (
    <form
      onSubmit={state.handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      <ModeBanner selectedUnit={state.selectedUnit} isInProgress={state.isInProgress} />

      <div className="archon-grid-2-sovereign items-start gap-10 relative z-30">
        <ConfigPanel state={state} />
        <OperationalPanel state={state} />
      </div>

      <UpaPreviewSection state={state} />

      {state.selectedUnit && (
        <FuelSection
          isInProgress={state.isInProgress}
          unit={state.unit}
          fuelLevelEnd={state.fuelLevelEnd}
          onFuelLevelEnd={state.setFuelLevelEnd}
          endOdometer={state.endOdometer}
          onEndOdometer={state.setEndOdometer}
          odometerAtService={state.odometerAtService}
          fuelLitersLoaded={state.fuelLitersLoaded}
          onFuelLitersLoaded={state.setFuelLitersLoaded}
          fuelAmount={state.fuelAmount}
          onFuelAmount={state.setFuelAmount}
          inputClass={inputClass}
        />
      )}

      <ActionBar state={state} onCancel={onCancel} />
    </form>
  );
};

export default MaintenanceRegistrationForm;
