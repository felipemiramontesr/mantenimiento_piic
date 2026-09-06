import React from 'react';
import { X, Save, Warehouse } from 'lucide-react';
import { RegistrationState } from './useRegistrationState';
import { getSubmitBtnClass, getSubmitLabel } from './constants';

interface ActionBarProps {
  state: RegistrationState;
  onCancel: () => void;
}

/** Barra de acciones: cancelar / registrar servicio
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function ActionBar({ state, onCancel }: ActionBarProps): React.JSX.Element {
  return (
    <div className="archon-grid-2-sovereign gap-10 !mt-5 pt-0 sticky bottom-0 z-10 bg-white pb-4 md:static md:bg-transparent md:pb-0">
      <div />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button type="button" onClick={onCancel} className="btn-sentinel-red w-full">
          <X size={14} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={state.submitting || !state.canSubmit}
          className={`w-full h-11 flex items-center justify-center gap-2 px-4 rounded-[4px] text-archon-label font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50 ${getSubmitBtnClass(
            state.isInProgress
          )}`}
        >
          {state.isInProgress ? <Warehouse size={14} /> : <Save size={14} />}
          {getSubmitLabel(state.isInProgress, state.submitting)}
        </button>
      </div>
    </div>
  );
}

export default ActionBar;
