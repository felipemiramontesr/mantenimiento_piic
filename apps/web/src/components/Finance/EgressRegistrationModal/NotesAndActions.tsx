import React from 'react';
import { EgressFormData, FieldError } from './types';

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
    <div className="flex flex-col gap-1.5">
      <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
        Notas
      </label>
      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
        rows={2}
        placeholder="Descripción adicional..."
        maxLength={1000}
        className={`${inputCls('notes')} resize-none`}
      />
    </div>

    {fieldError && !['unitId', 'category', 'amount'].includes(fieldError.field) && (
      <p className="text-archon-md text-sentinel-red font-bold bg-red-50 px-3 py-2 rounded-[4px]">
        {fieldError.message}
      </p>
    )}

    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 h-10 text-archon-base font-black uppercase tracking-widest text-pinnacle-navy/60 bg-slate-100 hover:bg-slate-200 rounded-[4px] transition-all duration-200"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex-1 h-10 text-archon-base font-black uppercase tracking-widest text-white bg-pinnacle-navy hover:brightness-110 rounded-[4px] transition-all duration-200 disabled:opacity-50"
      >
        {submitting ? 'Registrando...' : 'Registrar Egreso'}
      </button>
    </div>
  </>
);
