import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import api from '../../../api/client';
import { CreateTransactionPayload, FinanceCategory } from '../../../types/finance';
import { EgressFormData, FieldError } from './types';

function validateEgressForm(
  form: EgressFormData,
  setFieldError: Dispatch<SetStateAction<FieldError | null>>
): boolean {
  if (!form.unitId) {
    setFieldError({ field: 'unitId', message: 'Selecciona una unidad' });
    return false;
  }
  if (!form.category) {
    setFieldError({ field: 'category', message: 'Selecciona una categoría' });
    return false;
  }
  const amt = Number.parseFloat(form.amount);
  if (!form.amount || Number.isNaN(amt) || amt <= 0) {
    setFieldError({ field: 'amount', message: 'El monto debe ser mayor a $0' });
    return false;
  }
  return true;
}

export interface UseEgressSubmitResult {
  submitting: boolean;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

/** Validación + envío del formulario de egreso (FC163 F2B3, split de EgressRegistrationModal). */
export function useEgressSubmit(
  form: EgressFormData,
  setFieldError: Dispatch<SetStateAction<FieldError | null>>,
  onSuccess: () => void
): UseEgressSubmitResult {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateEgressForm(form, setFieldError)) return;

    setSubmitting(true);
    setFieldError(null);

    const payload: CreateTransactionPayload = {
      unitId: form.unitId,
      category: form.category as FinanceCategory,
      amount: Number.parseFloat(form.amount),
      vendor: form.vendor || null,
      invoiceRef: form.invoiceRef || null,
      notes: form.notes || null,
    };

    try {
      await api.post('/finance/transactions', payload);
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; field?: string } } };
      const msg = apiErr.response?.data?.message ?? 'Error al registrar el egreso';
      const field = apiErr.response?.data?.field ?? '';
      setFieldError({ field, message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, handleSubmit };
}
