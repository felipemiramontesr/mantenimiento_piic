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
    if (isFinished) return { text: 'Sincronizar', className: 'btn-sentinel-emerald' };
    if (isEdit) {
      const hasOdometer = Number(formData.endReading) > 0;
      return {
        text: hasOdometer ? 'Finalizar Misión' : 'Actualizar Trayecto',
        className: hasOdometer ? 'btn-sentinel-amber' : 'btn-sentinel-sky',
      };
    }
    return {
      text: 'Autorizar Despacho',
      className: 'btn-sentinel-emerald',
    };
  };

  const startReadingDisplay = isEdit
    ? routeToEdit?.start_km?.toLocaleString() || '0,000'
    : Number(selectedUnitData?.odometer || 0).toLocaleString();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-4">
      <form key={routeToEdit?.uuid || 'new'} onSubmit={handleSubmit} className="space-y-2">
        <div className="archon-grid-2 gap-8">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN */}
          <div className="glass-card-pro p-6 space-y-2 bg-white">
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
              origins={origins}
            />

            {/* Trash action integrated in first panel if editing - Anchored to bottom */}
            {isEdit && (
              <div className="pt-4 mt-auto border-t border-slate-100">
                <button
                  type="button"
                  onClick={triggerAuditDelete}
                  className="btn-sentinel-red w-full opacity-60 hover:opacity-100"
                >
                  <Trash2 size={16} /> Eliminar Registro
                </button>
              </div>
            )}
          </div>

          {/* COLUMNA 2: TELEMETRÍA Y CIERRE */}
          <div className="glass-card-pro p-6 space-y-2 bg-white">
            <RouteTelemetryPanel
              formData={formData}
              updateForm={updateForm}
              isEdit={isEdit}
              tankCapacity={selectedUnitData?.fuelTankCapacity || 0}
              startReadingDisplay={startReadingDisplay}
            />
            {isEdit && (
              <RouteClosurePanel formData={formData} updateForm={updateForm} isEdit={isEdit} />
            )}

            {/* 🔱 SOVEREIGN ACTION ECOSYSTEM - Anchored to bottom */}
            <div className="flex gap-4 pt-8 mt-auto border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-sentinel-red w-1/2 group">
                <ChevronRight
                  size={18}
                  className="rotate-180 group-hover:-translate-x-1 transition-transform"
                />
                <span className="truncate">{isEdit ? 'Volver a Bitácora' : 'Cancelar'}</span>
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  (!isFinished &&
                    (!formData.unitId || !formData.operatorId || !formData.destination))
                }
                className={`${getButtonState().className} w-1/2 group`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transmitiendo...
                  </>
                ) : (
                  <>
                    <span className="tracking-[0.2em]">{getButtonState().text}</span>
                    {isFinished ? (
                      <Save size={18} className="animate-pulse" />
                    ) : (
                      <ChevronRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Reporting */}
        {error && (
          <div className="mt-4 px-6 py-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[11px] font-bold rounded-[4px] shadow-sm">
            {error}
          </div>
        )}
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
