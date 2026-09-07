import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { MaintenanceTemplateTask } from '../../../types/maintenance';
import ArchonSelect from '../../ArchonSelect';
import { CompletionState } from './useCompletionState';
import { statusOptions } from './constants';

interface ChecklistRowProps {
  readonly task: MaintenanceTemplateTask;
  readonly idx: number;
  readonly state: CompletionState;
}

/** Fila individual de la checklist de cierre (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function ChecklistRow({ task, idx, state }: ChecklistRowProps): React.JSX.Element {
  return (
    <div className="px-10 py-5 archon-grid-2-sovereign gap-10 items-center hover:bg-[#0f2a44]/[0.02] transition-colors duration-200">
      <div className="min-w-0 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-archon-lg font-bold text-[#0f2a44]">{task.label}</div>
          {task.isDeferredCarry && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/30 text-archon-sm font-black text-amber-600 uppercase tracking-[0.1em]">
              ↩ Diferido
            </span>
          )}
        </div>
        <div className="text-archon-sm font-black text-[#0f2a44]/30 uppercase tracking-[0.15em] mt-0.5">
          {task.code}
          {task.isCritical && <span className="ml-2 text-red-500">● CRÍTICO</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArchonSelect
          options={statusOptions}
          // `template`/`details` se asignan juntos en el mismo effect (misma
          // longitud, mismo `res.data.tasks`) y `status` arranca siempre en
          // 'PASS' -- el fallback doble que había aquí era, por construcción,
          // inalcanzable (FC165 F3 Slice3.3 Lote A, purga sintáctica).
          value={state.details[idx].status}
          onChange={(val: string): void => state.handleDetailChange(idx, 'status', val)}
          searchable={false}
        />
        <input
          type="text"
          placeholder="Notas..."
          value={state.details[idx]?.notes || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            state.handleDetailChange(idx, 'notes', e.target.value)
          }
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg outline-none"
        />
      </div>
    </div>
  );
}

/** Checklist de cierre: carga/vacío/lista de tareas del servicio
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function ClosureChecklist({ state }: { readonly state: CompletionState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#f2b705] !pb-2">
      <div className="card-sovereign-header p-10 pb-0">
        <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">CHECKLIST DE CIERRE</h3>
      </div>
      {state.loadingTemplate && (
        <div className="p-12 text-center text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
          Generando matriz de inspección...
        </div>
      )}
      {!state.loadingTemplate && state.template.length === 0 && (
        <div className="p-12 text-center text-archon-base font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
          No se encontraron tareas para este servicio.
        </div>
      )}
      {!state.loadingTemplate && state.template.length > 0 && (
        <div className="divide-y divide-[#0f2a44]/5">
          {state.template.map((task, idx) => (
            <ChecklistRow key={task.code} task={task} idx={idx} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ClosureChecklist;
