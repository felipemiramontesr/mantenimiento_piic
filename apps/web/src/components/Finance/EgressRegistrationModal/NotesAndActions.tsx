import React from 'react';
import { MessageSquare } from 'lucide-react';
import { EgressFormData, FieldError } from './types';
import ArchonField from '../../ArchonField';

export interface NotesAndActionsProps {
  form: EgressFormData;
  fieldError: FieldError | null;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  inputCls: (field: string) => string;
  submitting: boolean;
  onClose: () => void;
}

/** Notas + error general + botones de acción (FC163 F2B3, split de EgressRegistrationModal). */
export const NotesAndActions: React.FC<NotesAndActionsProps> = ({
  form,
  fieldError,
  handleChange,
  inputCls,
  submitting,
  onClose,
}) => (
  <>
    <ArchonField label="Notas" icon={MessageSquare}>
      <textarea
        id="egress-notes"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        rows={2}
        placeholder="Descripción adicional..."
        maxLength={1000}
        className={`${inputCls('notes')} resize-none`}
      />
    </ArchonField>

    {fieldError && !['unitId', 'category', 'amount'].includes(fieldError.field) && (
      <p className="text-archon-md text-red-700 font-bold bg-red-50 px-3 py-2 rounded-[4px]">
        {fieldError.message}
      </p>
    )}

    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex flex-1 items-center justify-center h-11 text-xs font-black uppercase tracking-widest text-pinnacle-navy/50 hover:text-pinnacle-navy"
      >
        Cancelar
      </button>
      <button type="submit" disabled={submitting} className="btn-sentinel-emerald flex-1 text-xs">
        {submitting ? 'Registrando...' : 'Registrar Egreso'}
      </button>
    </div>
  </>
);
