import { type ChangeEvent, type Dispatch, type SetStateAction, useState } from 'react';
import { EMPTY_EGRESS_FORM, EgressFormData, FieldError } from './types';

export interface UseEgressFormStateResult {
  form: EgressFormData;
  setForm: Dispatch<SetStateAction<EgressFormData>>;
  fieldError: FieldError | null;
  setFieldError: Dispatch<SetStateAction<FieldError | null>>;
  handleChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  inputCls: (field: string) => string;
}

/** Estado del formulario + el input activo con error (FC163 F2B3, split de EgressRegistrationModal). */
export function useEgressFormState(): UseEgressFormStateResult {
  const [form, setForm] = useState<EgressFormData>(EMPTY_EGRESS_FORM);
  const [fieldError, setFieldError] = useState<FieldError | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldError?.field === name) setFieldError(null);
  };

  const inputCls = (field: string): string =>
    `w-full text-archon-label font-bold text-pinnacle-navy bg-white border rounded-[4px] px-3 py-2.5 focus:outline-none transition-colors duration-200 ${
      fieldError?.field === field
        ? 'border-sentinel-red focus:border-sentinel-red'
        : 'border-slate-200 focus:border-pinnacle-navy/30'
    }`;

  return { form, setForm, fieldError, setFieldError, handleChange, inputCls };
}
