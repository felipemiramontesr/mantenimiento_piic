import React from 'react';
import { ChevronRight, Save, Trash2 } from 'lucide-react';
import useRouteAssignmentControl from './RouteAssignment/useRouteAssignmentControl';
import { RouteLog } from './RouteLogTable';
import AuditJustificationModal from '../Common/AuditJustificationModal';

// Sub-Panels
import RouteIdentityPanel from './RouteAssignment/RouteIdentityPanel';
import RouteMissionPanel from './RouteAssignment/RouteMissionPanel';
import RouteTelemetryPanel from './RouteAssignment/RouteTelemetryPanel';
import RouteClosurePanel from './RouteAssignment/RouteClosurePanel';

interface RouteAssignmentFormProps {
  onClose: () => void;
  routeToEdit?: RouteLog | null;
}

/**
 * 🔱 ARCHON COCKPIT: RouteAssignmentForm (Refactored v.60.0.0)
 * Philosophy: Sovereign Asset Dispatch Command Center.
 * Architecture: Atomic Decomposition & Headless Logic via useRouteAssignmentControl.
 */
const RouteAssignmentForm: React.FC<RouteAssignmentFormProps> = ({ onClose, routeToEdit }) => {
  const {
    formData,
    updateForm,
    isEdit,
    isFinished,
    origins,
    availableUnits,
    operatorOptions,
    selectedUnitData,
    submitting,
    error,
    isAuditModalOpen,
    setIsAuditModalOpen,
    auditAction,
    handleConfirmAudit,
    handleSubmit,
    triggerAuditDelete,
  } = useRouteAssignmentControl(onClose, routeToEdit);

  // 📐 Computed UI Logic (V8 Performance Optimized)
  const getButtonState = (): { text: string; className: string } => {
    if (isFinished)
      return { text: 'Cerrar Vista', className: 'bg-emerald-600 hover:bg-emerald-700' };
    if (isEdit)
      return {
        text: 'Finalizar Misión',
        className: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      };
    return {
      text: 'Autorizar Despacho',
      className: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
    };
  };

  const { text: rightButtonText } = getButtonState();

  const startReadingDisplay = isEdit
    ? routeToEdit?.start_km?.toLocaleString() || '0,000'
    : Number(selectedUnitData?.odometer || 0).toLocaleString();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-4">
      <form key={routeToEdit?.uuid || 'new'} onSubmit={handleSubmit} className="space-y-6">
        <div className="archon-grid-2 gap-8 items-start">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN */}
          <div className="glass-card-pro p-6 space-y-6 bg-white">
            <RouteIdentityPanel
              formData={formData}
              updateForm={updateForm}
              isEdit={isEdit}
              isFinished={isFinished}
              availableUnits={availableUnits}
              operatorOptions={operatorOptions}
              selectedUnitData={selectedUnitData}
            />
            <RouteMissionPanel
              formData={formData}
              updateForm={updateForm}
              isEdit={isEdit}
              isFinished={isFinished}
              origins={origins}
            />
          </div>

          {/* COLUMNA 2: TELEMETRÍA Y CIERRE */}
          <div className="glass-card-pro p-6 space-y-6 bg-white">
            <RouteTelemetryPanel
              formData={formData}
              updateForm={updateForm}
              isEdit={isEdit}
              isFinished={isFinished}
              tankCapacity={selectedUnitData?.fuelTankCapacity || 0}
              startReadingDisplay={startReadingDisplay}
            />
            {isEdit && (
              <RouteClosurePanel
                formData={formData}
                updateForm={updateForm}
                isEdit={isEdit}
                isFinished={isFinished}
              />
            )}
          </div>
        </div>

        {/* Status Reporting */}
        {error && (
          <div className="px-6 py-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[11px] font-bold rounded-[4px] shadow-sm">
            {error}
          </div>
        )}

        {/* Sovereign Footer (Refactored v.60.1.5) */}
        <div className="archon-grid-2 mt-2 pt-6 border-t border-slate-100">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={triggerAuditDelete}
                className="btn-sentinel-red w-full"
              >
                <Trash2 size={18} /> Eliminar Registro
              </button>
            )}
          </div>
          <div className="archon-button-group">
            <button type="button" onClick={onClose} className="btn-sentinel-red">
              {isFinished ? 'Volver a Bitácora' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (!isFinished &&
                  (!formData.unitId ||
                    !formData.operatorId ||
                    !formData.destination ||
                    (isEdit && !formData.endReading)))
              }
              className={`btn-sentinel-emerald ${
                submitting ? 'opacity-50 grayscale cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                'Procesando...'
              ) : (
                <>
                  {isFinished ? 'Sincronizar Cambios' : rightButtonText}
                  {isFinished ? <Save size={18} /> : <ChevronRight size={18} />}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
        onClose={(): void => setIsAuditModalOpen(false)}
        onConfirm={handleConfirmAudit}
        title={
          auditAction === 'UPDATE'
            ? `Rectificación administrativa del trayecto ${routeToEdit?.id}`
            : `Eliminación forense del registro ${routeToEdit?.id}`
        }
        actionType={auditAction}
      />
    </div>
  );
};

export default RouteAssignmentForm;
