import React from 'react';
import { MaintenanceLog } from '../../types/maintenance';
import { useUsers } from '../../context/UserContext';
import { useCompletionState } from './MaintenanceCompletionPanel/useCompletionState';
import ContextBanner from './MaintenanceCompletionPanel/ContextBanner';
import ClosureDataPanel from './MaintenanceCompletionPanel/ClosureDataPanel';
import FinancialPanel from './MaintenanceCompletionPanel/FinancialPanel';
import FuelTelemetrySection from './MaintenanceCompletionPanel/FuelTelemetrySection';
import ClosureChecklist from './MaintenanceCompletionPanel/ClosureChecklist';
import ActionBar from './MaintenanceCompletionPanel/ActionBar';

interface MaintenanceCompletionPanelProps {
  log: MaintenanceLog;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 🔱 Cierre de servicio de taller — orquestador (FC165 F3 Slice3.3 Lote A,
 * Dual-Gate Isolation: estado/lógica y secciones en `MaintenanceCompletionPanel/`).
 */
const MaintenanceCompletionPanel: React.FC<MaintenanceCompletionPanelProps> = ({
  log,
  onSuccess,
  onCancel,
}) => {
  const { users } = useUsers();
  const state = useCompletionState(log, users, onSuccess);

  return (
    <form
      onSubmit={state.handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      <ContextBanner log={log} />

      {state.error && (
        <div className="px-5 py-3 rounded-[4px] bg-red-50 border border-red-200 text-archon-label font-bold text-red-700">
          {state.error}
        </div>
      )}

      <div className="archon-grid-2-sovereign items-start gap-10 relative z-30">
        <ClosureDataPanel log={log} state={state} />
        <FinancialPanel state={state} />
      </div>

      <FuelTelemetrySection state={state} />
      <ClosureChecklist state={state} />
      <ActionBar state={state} onCancel={onCancel} />
    </form>
  );
};

export default MaintenanceCompletionPanel;
