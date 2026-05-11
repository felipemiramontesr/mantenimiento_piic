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
 * 🔱 ARCHON COCKPIT: RouteAssignmentForm (Refactored v.78.100.5)
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
    if (isFinished) return { text: 'Sincronizar', className: 'btn-sentinel-emerald-static' };
    if (isEdit) {
      const hasOdometer = Number(formData.endReading) > 0;
      return {
        text: hasOdometer ? 'Finalizar Misión' : 'Actualizar Trayecto',
        className: hasOdometer ? 'btn-sentinel-amber-static' : 'btn-sentinel-sky-static',
      };
    }
    return {
      text: 'Autorizar Despacho',
      className: 'btn-sentinel-emerald-static',
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

            {/* FASE III: TELEMETRÍA - Integrated in left panel */}
            <div className="pt-4 border-t border-slate-100">
              <RouteTelemetryPanel
                formData={formData}
                updateForm={updateForm}
                isEdit={isEdit}
                tankCapacity={selectedUnitData?.fuelTankCapacity || 0}
                startReadingDisplay={startReadingDisplay}
              />
            </div>
          </div>

          {/* COLUMNA 2: CIERRE Y EVIDENCIA */}
          <div className="glass-card-pro p-6 space-y-2 bg-white">
            {isEdit ? (
              <RouteClosurePanel formData={formData} updateForm={updateForm} isEdit={isEdit} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-30 space-y-4 py-20">
                <div className="bg-slate-100 p-6 rounded-full">
                  <ChevronRight size={48} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Fase IV Bloqueada
                  </h4>
                  <p className="text-[8px] font-bold uppercase tracking-widest mt-1">
                    Disponible solo en modo edición/retorno
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🔱 SOVEREIGN GLOBAL ACTION BAR - Aligned with Axial Grid for Uniformity */}
        <div className="archon-grid-2 gap-8 pt-8 mt-4 border-t border-[#0f2a44]/5">
          {/* Left Panel Action: Danger Zone */}
          <div className="flex items-center">
            {isEdit && (
              <button
                type="button"
                onClick={triggerAuditDelete}
                className="btn-sentinel-red-static w-full"
              >
                <Trash2 size={16} /> Eliminar Registro
              </button>
            )}
          </div>

          {/* Right Panel Action: Command Execution */}
          <div className="flex items-center">
            <button
              type="submit"
              disabled={
                submitting ||
                (!isFinished && (!formData.unitId || !formData.operatorId || !formData.destination))
              }
              className={`${getButtonState().className} w-full group`}
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
        loading={submitting}
      />
    </div>
  );
};

export default RouteAssignmentForm;
