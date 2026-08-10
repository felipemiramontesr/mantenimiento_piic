import React from 'react';
import { FileText } from 'lucide-react';
import { UseFleetFormReturn } from '../../../types/fleet';

type OperationsSectionProps = Pick<UseFleetFormReturn, 'formData' | 'setFormData'>;

/** PANEL 5a (sin título) — Especificaciones de fábrica / notas técnicas del activo. */
export function OperationsSection({
  formData,
  setFormData,
}: OperationsSectionProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44] min-h-[190px] flex flex-col justify-between">
      <div className="card-sovereign-header">
        <FileText size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">
          ESPECIFICACIONES DE FÁBRICA
        </h3>
      </div>
      <div className="flex-1 flex flex-col">
        <textarea
          placeholder="Ingresar especificaciones críticas de este activo..."
          className="w-full bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none flex-1 min-h-[110px] py-4 resize-none leading-relaxed"
          value={formData.description ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>
    </div>
  );
}

export default OperationsSection;
