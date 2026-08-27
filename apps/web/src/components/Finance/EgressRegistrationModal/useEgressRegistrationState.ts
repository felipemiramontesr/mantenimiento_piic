import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FleetUnit } from '../../../types/fleet';
import { EgressFormData, FieldError } from './types';
import { useEgressUnits } from './useEgressUnits';
import { useEgressFormState } from './useEgressFormState';
import { useEgressSubmit } from './useEgressSubmit';

export interface UseEgressRegistrationStateResult {
  units: FleetUnit[];
  form: EgressFormData;
  setForm: Dispatch<SetStateAction<EgressFormData>>;
  fieldError: FieldError | null;
  handleChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  inputCls: (field: string) => string;
  submitting: boolean;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

/** Compone unidades + estado de formulario + envío del modal de egreso (FC163 F2B3, split). */
export function useEgressRegistrationState(
  onSuccess: () => void
): UseEgressRegistrationStateResult {
  const units = useEgressUnits();
  const { form, setForm, fieldError, setFieldError, handleChange, inputCls } = useEgressFormState();
  const { submitting, handleSubmit } = useEgressSubmit(form, setFieldError, onSuccess);

  return { units, form, setForm, fieldError, handleChange, inputCls, submitting, handleSubmit };
}
