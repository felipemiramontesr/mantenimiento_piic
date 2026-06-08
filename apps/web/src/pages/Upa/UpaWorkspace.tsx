import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Wrench,
  Layers,
  Clock,
  CheckCircle,
  ShieldAlert,
  XCircle,
  ClipboardList,
  Truck,
  CheckSquare,
  Plus,
  Trash2,
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useUpaOrder } from '../../hooks/useUpaOrder';
import type {
  UpaTaskDetail,
  UpaWorkOrderDetail,
  UpaDeferredType,
  UpaFleetType,
  UpaTaskStage,
} from '../../types/upa';

// ─── Stage Configuration ──────────────────────────────────────────────────────

const STAGE_ICONS: Record<UpaTaskStage, LucideIcon> = {
  triage: Search,
  minor_service: Wrench,
  cascade: Layers,
  deferred: Clock,
  closure: CheckSquare,
};

const STAGE_LABELS: Record<UpaTaskStage, string> = {
  triage: 'Triaje',
  minor_service: 'Servicio Menor',
  cascade: 'Cascada',
  deferred: 'Diferidos',
  closure: 'Cierre',
};

const STAGE_STEP: Record<UpaTaskStage, number> = {
  triage: 1,
  minor_service: 2,
  cascade: 3,
  deferred: 4,
  closure: 6,
};

const STAGE_ORDER: UpaTaskStage[] = ['triage', 'minor_service', 'cascade', 'deferred', 'closure'];

function computeStep(wo: UpaWorkOrderDetail): number {
  if (wo.status === 'CLOSED') return 6;
  if (wo.status === 'AWAITING_AUTH') return 5;
  const found = STAGE_ORDER.find((stage) =>
    wo.tasks.some((t) => t.stage === stage && t.status === 'pending')
  );
  return found !== undefined ? STAGE_STEP[found] : 6;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Triaje' },
  { n: 2, label: 'Serv. Menor' },
  { n: 3, label: 'Cascada' },
  { n: 4, label: 'Diferidos' },
  { n: 5, label: 'Autorización' },
  { n: 6, label: 'Cierre' },
];

function getStepCircleClass(stepN: number, current: number): string {
  if (stepN < current) return 'bg-[#0f2a44] text-white';
  if (stepN === current) return 'bg-[#f2b705] text-[#0f2a44] ring-4 ring-[#f2b705]/20';
  return 'bg-slate-100 text-slate-400';
}

function getStepLabelClass(stepN: number, current: number): string {
  if (stepN < current) return 'text-[#0f2a44]';
  if (stepN === current) return 'text-[#f2b705]';
  return 'text-slate-400';
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div data-testid="upa-stepper" className="flex items-start w-full my-6 overflow-x-auto pb-2">
    {STEPS.map((step, i) => (
      <React.Fragment key={step.n}>
        <div className="flex flex-col items-center flex-shrink-0 min-w-[60px]">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${getStepCircleClass(
              step.n,
              currentStep
            )}`}
          >
            {step.n < currentStep ? <CheckCircle size={16} /> : step.n}
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 text-center leading-tight ${getStepLabelClass(
              step.n,
              currentStep
            )}`}
          >
            {step.label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={`flex-1 h-[2px] mt-[18px] mx-1 transition-all duration-300 min-w-[12px] ${
              step.n < currentStep ? 'bg-[#0f2a44]' : 'bg-slate-200'
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Task Helpers ─────────────────────────────────────────────────────────────

type UpaTaskStatus = UpaTaskDetail['status'];

function getStatusIcon(status: UpaTaskStatus): LucideIcon {
  if (status === 'completed') return CheckCircle;
  if (status === 'DEFERRED_FINANCIAL') return XCircle;
  if (status === 'N_A_STRUCTURAL') return ShieldAlert;
  return Clock;
}

function getStatusLabel(status: UpaTaskStatus): string {
  if (status === 'completed') return 'Completada';
  if (status === 'DEFERRED_FINANCIAL') return 'Dif. Financiero';
  if (status === 'N_A_STRUCTURAL') return 'No Aplica';
  return 'Pendiente';
}

function getDescriptionCls(status: UpaTaskStatus): string {
  if (status === 'completed') return 'line-through text-[#0f2a44]/40';
  if (status !== 'pending') return 'text-[#0f2a44]/50';
  return 'text-[#0f2a44]';
}

function getBadgeCls(status: UpaTaskStatus): string {
  if (status === 'completed') return 'text-emerald-700 bg-emerald-50';
  if (status === 'DEFERRED_FINANCIAL') return 'text-red-600 bg-red-50';
  return 'text-amber-700 bg-amber-50';
}

// ─── Evidence Input ───────────────────────────────────────────────────────────

interface EvidenceInputProps {
  urls: string[];
  notes: string;
  onUrlsChange: (urls: string[]) => void;
  onNotesChange: (notes: string) => void;
}

const EvidenceInput: React.FC<EvidenceInputProps> = ({
  urls,
  notes,
  onUrlsChange,
  onNotesChange,
}) => {
  const addUrl = (): void => onUrlsChange([...urls, '']);
  const removeUrl = (idx: number): void => onUrlsChange(urls.filter((_, i) => i !== idx));
  const updateUrl = (idx: number, val: string): void =>
    onUrlsChange(urls.map((u, i) => (i === idx ? val : u)));

  return (
    <div className="mt-3 p-3 border border-slate-200 rounded-[4px] bg-slate-50 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/60">
        Evidencias (URLs)
      </p>
      {urls.map((url, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            placeholder="https://..."
            value={url}
            onChange={(e): void => updateUrl(idx, e.target.value)}
            data-testid={`evidence-url-input-${idx}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50"
          />
          <button
            onClick={(): void => removeUrl(idx)}
            className="p-2 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Eliminar URL"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addUrl}
        data-testid="add-evidence-url-btn"
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
      >
        <Plus size={12} />
        Agregar URL
      </button>
      <textarea
        placeholder="Notas de evidencia (opcional)"
        value={notes}
        onChange={(e): void => onNotesChange(e.target.value)}
        rows={2}
        data-testid="evidence-notes-input"
        className="w-full px-3 py-2 text-sm font-medium text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50 resize-none"
      />
    </div>
  );
};

// ─── Defer Modal ──────────────────────────────────────────────────────────────

interface DeferModalProps {
  taskDescription: string;
  deferType: UpaDeferredType;
  onDeferTypeChange: (t: UpaDeferredType) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeferModal: React.FC<DeferModalProps> = ({
  taskDescription,
  deferType,
  onDeferTypeChange,
  onConfirm,
  onCancel,
  loading,
}) => (
  <div
    data-testid="defer-modal"
    className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
  >
    <div className="bg-white rounded-[4px] shadow-xl w-full max-w-md p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
      <h3 className="font-black uppercase tracking-tight text-[#0f2a44] text-lg">Diferir Tarea</h3>
      <p className="text-sm font-bold text-[#0f2a44]/60 uppercase tracking-wide line-clamp-2">
        {taskDescription}
      </p>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/50">
          Tipo de diferimiento
        </label>
        <select
          value={deferType}
          onChange={(e): void => onDeferTypeChange(e.target.value as UpaDeferredType)}
          data-testid="defer-type-select"
          className="w-full px-3 py-2.5 text-sm font-bold text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none"
        >
          <option value="DEFERRED_FINANCIAL">Diferimiento Financiero</option>
          <option value="N_A_STRUCTURAL">No Aplica — Estructural</option>
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 font-bold text-sm uppercase tracking-wider text-[#0f2a44] border border-slate-200 rounded-[4px] hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          data-testid="defer-confirm-btn"
          className="flex-1 py-2.5 font-bold text-sm uppercase tracking-wider text-white bg-[#ef4444] rounded-[4px] hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? 'Diferiendo...' : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Init Form ────────────────────────────────────────────────────────────────

interface InitFormProps {
  onSubmit: (vehicleId: string, fleetType: UpaFleetType) => void;
  loading: boolean;
  error: string | null;
}

const InitForm: React.FC<InitFormProps> = ({ onSubmit, loading, error }) => {
  const [vehicleId, setVehicleId] = useState('');
  const [fleetType, setFleetType] = useState<UpaFleetType>('urban');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (vehicleId.trim()) onSubmit(vehicleId.trim(), fleetType);
  };

  return (
    <div className="animate-in fade-in duration-700 flex items-center justify-center min-h-[55vh]">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h2 className="text-[#0f2a44] font-black text-2xl tracking-tight uppercase">
            Nueva Orden UPA
          </h2>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0f2a44]/50 mt-1">
            Proceso Universal Archon — Iniciar Pipeline
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/60">
              ID de Unidad
            </label>
            <input
              type="text"
              value={vehicleId}
              onChange={(e): void => setVehicleId(e.target.value)}
              placeholder="Ej: ASM-001"
              required
              data-testid="vehicle-id-input"
              className="w-full px-4 py-3 font-bold text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/60">
              Tipo de Flotilla
            </label>
            <div className="flex gap-3">
              {(['urban', 'mining'] as UpaFleetType[]).map((ft) => (
                <label
                  key={ft}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3 rounded-[4px] cursor-pointer border-2 font-black text-sm uppercase tracking-wider transition-all duration-200
                    ${
                      fleetType === ft
                        ? 'border-[#0f2a44] bg-[#0f2a44] text-white'
                        : 'border-slate-200 bg-white text-[#0f2a44]/50 hover:border-[#0f2a44]/30'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="fleetType"
                    value={ft}
                    checked={fleetType === ft}
                    onChange={(): void => setFleetType(ft)}
                    className="sr-only"
                    data-testid={`fleet-type-${ft}`}
                  />
                  {ft === 'urban' ? <Truck size={16} /> : <Activity size={16} />}
                  {ft === 'urban' ? 'Urbana' : 'Minería'}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p data-testid="init-error" className="text-red-600 text-sm font-bold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !vehicleId.trim()}
            data-testid="init-submit-btn"
            className="w-full py-4 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Iniciando...' : 'Iniciar Proceso UPA'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Checklist Row ────────────────────────────────────────────────────────────

interface ChecklistRowProps {
  task: UpaTaskDetail;
  isUpdating: boolean;
  evidenceUrls: string[];
  evidenceNotes: string;
  onComplete: () => void;
  onDefer: () => void;
  onEvidenceUrlsChange: (urls: string[]) => void;
  onEvidenceNotesChange: (notes: string) => void;
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({
  task,
  isUpdating,
  evidenceUrls,
  evidenceNotes,
  onComplete,
  onDefer,
  onEvidenceUrlsChange,
  onEvidenceNotesChange,
}) => {
  const isPending = task.status === 'pending';
  const StatusIcon = getStatusIcon(task.status);

  const checkboxCls = (): string => {
    if (task.status === 'completed')
      return 'bg-emerald-500 border-emerald-500 text-white cursor-default';
    if (task.status === 'DEFERRED_FINANCIAL')
      return 'bg-red-100 border-red-400 text-red-500 cursor-default';
    if (task.status === 'N_A_STRUCTURAL')
      return 'bg-amber-100 border-amber-400 text-amber-600 cursor-default';
    return 'border-slate-300 bg-white hover:border-[#0f2a44]/60 hover:bg-[#0f2a44]/5 cursor-pointer';
  };

  return (
    <div data-testid={`task-card-${task.taskId}`} className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          data-testid={`complete-btn-${task.taskId}`}
          onClick={(): void => {
            if (isPending && !isUpdating) onComplete();
          }}
          disabled={!isPending || isUpdating}
          aria-label={isPending ? 'Marcar completada' : getStatusLabel(task.status)}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${checkboxCls()}`}
        >
          {task.status !== 'pending' && <StatusIcon size={11} />}
          {task.status === 'pending' && isUpdating && (
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse block" />
          )}
        </button>

        <span
          className={`flex-1 text-sm font-bold leading-tight ${getDescriptionCls(task.status)}`}
        >
          {task.description}
        </span>

        {!isPending && (
          <span
            className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getBadgeCls(
              task.status
            )}`}
          >
            {getStatusLabel(task.status)}
          </span>
        )}

        {isPending && (
          <button
            type="button"
            data-testid={`defer-btn-${task.taskId}`}
            onClick={onDefer}
            disabled={isUpdating}
            title="Diferir tarea"
            className="shrink-0 text-[#0f2a44]/25 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>

      {task.stage === 'closure' && isPending && (
        <div className="px-4 pb-3">
          <EvidenceInput
            urls={evidenceUrls}
            notes={evidenceNotes}
            onUrlsChange={onEvidenceUrlsChange}
            onNotesChange={onEvidenceNotesChange}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Workspace ───────────────────────────────────────────────────────────

interface UpaWorkspaceProps {
  workOrderId?: number;
  onReturn?: () => void;
}

const UpaWorkspace: React.FC<UpaWorkspaceProps> = ({
  workOrderId,
  onReturn,
}): React.ReactElement => {
  const upa = useUpaOrder();

  const [deferTaskId, setDeferTaskId] = useState<string | null>(null);
  const [deferType, setDeferType] = useState<UpaDeferredType>('DEFERRED_FINANCIAL');
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string[]>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});
  const [openStages, setOpenStages] = useState<Record<UpaTaskStage, boolean>>({
    triage: true,
    minor_service: false,
    cascade: false,
    deferred: false,
    closure: false,
  });

  // Auto-load order when workOrderId is provided (embedded mode — skips InitForm)
  useEffect(() => {
    if (workOrderId !== undefined && upa.workOrder === null && !upa.loading) {
      upa.loadOrder(workOrderId);
    }
  }, [workOrderId, upa.workOrder, upa.loading, upa.loadOrder]);

  const handleComplete = useCallback(
    (task: UpaTaskDetail): void => {
      const urls = (evidenceUrls[task.taskId] ?? []).filter((u) => u.trim().length > 0);
      const notes = evidenceNotes[task.taskId] ?? '';
      upa.completeTask(task.taskId, urls.length > 0 ? urls : undefined, notes || undefined);
    },
    [upa, evidenceUrls, evidenceNotes]
  );

  const handleDeferConfirm = useCallback((): void => {
    if (!deferTaskId) return;
    upa.deferTask(deferTaskId, deferType).then(() => {
      setDeferTaskId(null);
    });
  }, [deferTaskId, deferType, upa]);

  const deferringInFlight = deferTaskId ? !!upa.taskUpdating[deferTaskId] : false;
  const deferringTaskObj = deferTaskId
    ? (upa.workOrder?.tasks ?? []).find((t) => t.taskId === deferTaskId)
    : null;

  if (!upa.workOrder) {
    if (workOrderId !== undefined) {
      return (
        <div className="flex items-center justify-center py-16 text-[#0f2a44]/40 font-bold text-sm uppercase tracking-wider">
          {upa.loading ? 'Cargando orden UPA...' : upa.error ?? 'Orden no encontrada'}
        </div>
      );
    }
    return <InitForm onSubmit={upa.startOrder} loading={upa.initLoading} error={upa.error} />;
  }

  const wo = upa.workOrder;
  const currentStep = computeStep(wo);

  const sc = {
    IN_PROGRESS: { label: 'En Proceso', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    AWAITING_AUTH: {
      label: 'Esperando Autorización',
      color: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    },
    CLOSED: { label: 'Cerrada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[wo.status];

  const tasksByStage = STAGE_ORDER.reduce<Record<UpaTaskStage, UpaTaskDetail[]>>(
    (acc, stage) => ({
      ...acc,
      [stage]: wo.tasks.filter((t) => t.stage === stage),
    }),
    {} as Record<UpaTaskStage, UpaTaskDetail[]>
  );

  const toggleStage = (stage: UpaTaskStage): void => {
    setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* Back button — only in embedded panel mode */}
      {onReturn && (
        <button
          type="button"
          onClick={onReturn}
          data-testid="upa-return-btn"
          className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Mantenimiento
        </button>
      )}

      {/* Stepper */}
      <Stepper currentStep={currentStep} />

      {/* Order Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-[4px] border mb-6 ${sc.color}`}>
        <ClipboardList size={16} />
        <div>
          <span className="text-sm font-black uppercase tracking-wider block">{sc.label}</span>
          <span className="text-xs font-bold opacity-70 uppercase tracking-wide">
            Unidad: {wo.vehicleId} —{' '}
            {wo.fleetType === 'urban' ? 'Flotilla Urbana' : 'Flotilla Minería'} — OT #{wo.id}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {upa.error && (
        <div
          data-testid="order-error"
          className="flex items-center gap-2 px-4 py-3 rounded-[4px] border border-red-200 bg-red-50 text-red-700 mb-4"
        >
          <XCircle size={14} />
          <span className="text-sm font-bold">{upa.error}</span>
        </div>
      )}

      {/* AWAITING_AUTH Notice */}
      {wo.status === 'AWAITING_AUTH' && (
        <div
          data-testid="awaiting-auth-banner"
          className="flex items-start gap-3 px-4 py-4 rounded-[4px] border border-yellow-300 bg-yellow-50 text-yellow-800 mb-6"
        >
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-sm uppercase tracking-wider block">
              Autorización Requerida — Etapa 5
            </span>
            <span className="text-xs font-bold opacity-80 block mt-0.5">
              Existen tareas diferidas financieramente o no aplicables estructuralmente. Requiere
              validación del gerente de flota. El sistema cerrará automáticamente la orden después
              de 24 horas hábiles sin respuesta.
            </span>
          </div>
        </div>
      )}

      {/* Task Groups — Accordion */}
      <div className="space-y-3" data-testid="upa-accordion">
        {STAGE_ORDER.map((stage) => {
          const tasks = tasksByStage[stage];
          if (tasks.length === 0) return null;
          const StageIcon = STAGE_ICONS[stage];
          const pendingCount = tasks.filter((t) => t.status === 'pending').length;
          const isOpen = openStages[stage];

          return (
            <div
              key={stage}
              data-testid={`accordion-${stage}`}
              className="border border-slate-200 rounded-[4px] overflow-hidden"
            >
              <button
                type="button"
                data-testid={`accordion-toggle-${stage}`}
                onClick={(): void => toggleStage(stage)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-none outline-none cursor-pointer"
              >
                <StageIcon size={15} className="text-[#0f2a44]/60 shrink-0" />
                <span className="font-black uppercase tracking-[0.15em] text-[#0f2a44] text-sm flex-1">
                  Etapa {STAGE_STEP[stage]}: {STAGE_LABELS[stage]}
                </span>
                <span className="text-[10px] font-bold text-[#0f2a44]/40 uppercase tracking-wider">
                  {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
                {isOpen ? (
                  <ChevronDown size={14} className="text-[#0f2a44]/40 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-[#0f2a44]/40 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div
                  data-testid={`accordion-content-${stage}`}
                  className="divide-y divide-slate-100 animate-in fade-in duration-200"
                >
                  {tasks.map((task) => (
                    <ChecklistRow
                      key={task.taskId}
                      task={task}
                      isUpdating={!!upa.taskUpdating[task.taskId]}
                      evidenceUrls={evidenceUrls[task.taskId] ?? []}
                      evidenceNotes={evidenceNotes[task.taskId] ?? ''}
                      onComplete={(): void => handleComplete(task)}
                      onDefer={(): void => setDeferTaskId(task.taskId)}
                      onEvidenceUrlsChange={(urls): void =>
                        setEvidenceUrls((prev) => ({ ...prev, [task.taskId]: urls }))
                      }
                      onEvidenceNotesChange={(notes): void =>
                        setEvidenceNotes((prev) => ({ ...prev, [task.taskId]: notes }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Close Order Button */}
      {wo.status !== 'CLOSED' && (
        <div className="mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={(): void => {
              upa.closeCurrentOrder();
            }}
            disabled={upa.closingOrder || upa.loading}
            data-testid="close-order-btn"
            className="w-full md:w-auto px-8 py-4 font-black text-sm uppercase tracking-widest text-white bg-[#0f2a44] rounded-[4px] hover:brightness-125 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {upa.closingOrder ? 'Cerrando Orden...' : 'Cerrar Orden UPA'}
          </button>
        </div>
      )}

      {/* Closed State */}
      {wo.status === 'CLOSED' && (
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col items-center gap-4 py-8">
          <CheckCircle size={52} className="text-emerald-500" />
          <p className="font-black text-lg uppercase tracking-wider text-[#0f2a44]">
            Orden Cerrada Exitosamente
          </p>
          <p className="text-sm font-bold text-[#0f2a44]/50 uppercase tracking-wide">
            UUID: {wo.uuid}
          </p>
          {onReturn ? (
            <button
              onClick={onReturn}
              data-testid="new-order-btn"
              className="px-8 py-3 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all shadow-md"
            >
              Volver a Mantenimiento
            </button>
          ) : (
            <button
              onClick={upa.resetOrder}
              data-testid="new-order-btn"
              className="px-8 py-3 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all shadow-md"
            >
              Nueva Orden UPA
            </button>
          )}
        </div>
      )}

      {/* Defer Modal */}
      {deferTaskId && deferringTaskObj && (
        <DeferModal
          taskDescription={deferringTaskObj.description}
          deferType={deferType}
          onDeferTypeChange={setDeferType}
          onConfirm={handleDeferConfirm}
          onCancel={(): void => setDeferTaskId(null)}
          loading={deferringInFlight}
        />
      )}
    </div>
  );
};

export default UpaWorkspace;
