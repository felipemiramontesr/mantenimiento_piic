import React from 'react';
import { Save, Trash2 } from 'lucide-react';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import AuditJustificationModal from '../Common/AuditJustificationModal';
import { UseFleetFormReturn } from '../../types/fleet';
import { useAuth } from '../../context/AuthContext';
import IdentitySection from './FleetRegistrationForm/IdentitySection';
import ComplianceSection, {
  EnvironmentalPrediction,
} from './FleetRegistrationForm/ComplianceSection';
import TechnicalProfileSection from './FleetRegistrationForm/TechnicalProfileSection';
import LogisticsSection from './FleetRegistrationForm/LogisticsSection';
import OperationsSection from './FleetRegistrationForm/OperationsSection';
import AuditSection from './FleetRegistrationForm/AuditSection';
import { useFormComputed, FormComputed } from './FleetRegistrationForm/useFormComputed';
import {
  useAuditModalFlow,
  auditModalTitle,
  AuditModalFlowResult,
} from './FleetRegistrationForm/useAuditModalFlow';

/**
 * 🔱 Archon Alpha v.37.2.0 - "2x2 AXIAL ARCHITECTURE"
 * FC142 F2 — orchestrator only: invokes useFleetForm() via `controller`, composes
 * the 6 extracted sections, handles submit/delete/audit-modal (Cond.R-142-H3).
 */

interface FleetRegistrationFormProps {
  controller: UseFleetFormReturn;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  unitId?: string;
}

function getIsFlotillaOrInternal(ownerType: 'FLOTILLA' | 'ARCHONAUT' | null): boolean {
  return ownerType === 'FLOTILLA' || ownerType === null;
}

interface FormPanelsProps {
  controller: UseFleetFormReturn;
  isFlotillaOrInternal: boolean;
  isEdit: boolean;
  vencimientoVerif: string | undefined;
  prediction: EnvironmentalPrediction;
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
}

/** Compone los 4 paneles de datos + fila de notas/pronóstico (Cond.R-142-H3). */
function FormPanels({
  controller,
  isFlotillaOrInternal,
  isEdit,
  vencimientoVerif,
  prediction,
  pronosticoText,
  pronosticoDateStr,
  isPronosticoReady,
}: FormPanelsProps): React.JSX.Element {
  const { formData, setFormData } = controller;
  return (
    <>
      {/* ── 2x2 PANEL ARCHITECTURE ─────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-stretch gap-10">
        <IdentitySection {...controller} isFlotillaOrInternal={isFlotillaOrInternal} />
        <ComplianceSection
          {...controller}
          isFlotillaOrInternal={isFlotillaOrInternal}
          vencimientoVerif={vencimientoVerif}
          prediction={prediction}
        />
        <TechnicalProfileSection {...controller} isEdit={isEdit} />
        <LogisticsSection {...controller} isEdit={isEdit} />
      </div>

      {/* 🔮 PANEL 5: NOTAS Y PRONÓSTICO DE RENDIMIENTO (Shared Axial Alignment Row) */}
      <div className="archon-grid-2-sovereign items-stretch gap-10 mt-10">
        <OperationsSection formData={formData} setFormData={setFormData} />
        <AuditSection
          pronosticoText={pronosticoText}
          pronosticoDateStr={pronosticoDateStr}
          isPronosticoReady={isPronosticoReady}
        />
      </div>
    </>
  );
}

interface FormActionBarProps {
  isEdit: boolean;
  isProcessing: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  capturedReason: string | null;
  onRequestDelete: () => void;
  onCancel: () => void;
}

function submitButtonLabel(busy: boolean, capturedReason: string | null, isEdit: boolean): string {
  if (busy) return 'Transmitiendo...';
  if (capturedReason !== null) return 'Guardar Cambios';
  return isEdit ? 'Sincronizar Cambios' : 'Confirmar Alta';
}

/** Barra de acciones sticky: eliminar (edición) / cancelar / enviar. */
function FormActionBar({
  isEdit,
  isProcessing,
  isSubmitting,
  canSubmit,
  capturedReason,
  onRequestDelete,
  onCancel,
}: FormActionBarProps): React.JSX.Element {
  const busy = isSubmitting || isProcessing;
  return (
    <div className="archon-grid-2-sovereign mt-10 pt-0 border-t border-pinnacle-navy/5 sticky bottom-0 z-10 bg-white pb-4 md:static md:bg-transparent md:pb-0">
      <div>
        {isEdit && (
          <button type="button" onClick={onRequestDelete} className="btn-sentinel-red w-full">
            <Trash2 size={18} /> Eliminar Activo
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <button type="button" onClick={onCancel} className="btn-sentinel-red w-full">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !canSubmit}
          className={`${
            capturedReason !== null ? 'btn-sentinel-sky' : 'btn-sentinel-emerald'
          } w-full ${!canSubmit || busy ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          {submitButtonLabel(busy, capturedReason, isEdit)}
          <Save size={18} />
        </button>
      </div>
    </div>
  );
}

interface FormBodyProps {
  controller: UseFleetFormReturn;
  computed: FormComputed;
  auditFlow: AuditModalFlowResult;
  isFlotillaOrInternal: boolean;
  isEdit: boolean;
  isSubmitting: boolean;
  error: string | null;
  resetError: () => void;
  onCancel: () => void;
  unitId: string | undefined;
}

/** `<form>` + banner + paneles + barra de acciones + modal de auditoría. */
function FormBody({
  controller,
  computed,
  auditFlow,
  isFlotillaOrInternal,
  isEdit,
  isSubmitting,
  error,
  resetError,
  onCancel,
  unitId,
}: FormBodyProps): React.JSX.Element {
  return (
    <form
      onSubmit={auditFlow.handleFormSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-40 space-y-8"
    >
      <ArchonFeedbackBanner message={error || ''} type="error" onClear={resetError} />

      <FormPanels
        controller={controller}
        isFlotillaOrInternal={isFlotillaOrInternal}
        isEdit={isEdit}
        vencimientoVerif={computed.vencimientoVerif}
        prediction={computed.prediction}
        pronosticoText={computed.pronosticoText}
        pronosticoDateStr={computed.pronosticoDateStr}
        isPronosticoReady={computed.isPronosticoReady}
      />

      <FormActionBar
        isEdit={isEdit}
        isProcessing={auditFlow.isProcessing}
        isSubmitting={isSubmitting}
        canSubmit={computed.canSubmit}
        capturedReason={auditFlow.capturedReason}
        onRequestDelete={auditFlow.requestDelete}
        onCancel={onCancel}
      />

      <AuditJustificationModal
        isOpen={auditFlow.isAuditModalOpen}
        onClose={auditFlow.closeModal}
        onConfirm={auditFlow.confirmModal}
        title={auditModalTitle(auditFlow.auditAction, unitId)}
        actionType={auditFlow.auditAction}
        loading={auditFlow.isProcessing}
      />
    </form>
  );
}

/** Orquestador FC142 F2: compone Identity/Compliance/TechnicalProfile/Logistics/Operations/Audit. */
const FleetRegistrationForm: React.FC<FleetRegistrationFormProps> = ({
  controller,
  onSuccess,
  onCancel,
  isEdit = false,
  unitId,
}: FleetRegistrationFormProps): React.JSX.Element => {
  const { ownerType } = useAuth();
  const isFlotillaOrInternal = getIsFlotillaOrInternal(ownerType);
  const { formData, error, resetError, setError, setFormData, isSubmitting, handleSubmit } =
    controller;
  const computed = useFormComputed(
    formData,
    setFormData,
    controller.assetTypes,
    isFlotillaOrInternal
  );
  const auditFlow = useAuditModalFlow({
    isEdit,
    unitId,
    formData,
    setError,
    onSuccess,
    handleSubmit,
  });

  return (
    <FormBody
      controller={controller}
      computed={computed}
      auditFlow={auditFlow}
      isFlotillaOrInternal={isFlotillaOrInternal}
      isEdit={isEdit}
      isSubmitting={isSubmitting}
      error={error}
      resetError={resetError}
      onCancel={onCancel}
      unitId={unitId}
    />
  );
};

export default FleetRegistrationForm;
