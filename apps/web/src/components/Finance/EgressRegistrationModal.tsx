import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import api from '../../api/client';
import { FinanceCategory, CATEGORY_LABELS, CreateTransactionPayload } from '../../types/finance';
import { FleetUnit } from '../../types/fleet';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES: FinanceCategory[] = [
  'LEASE',
  'INSURANCE',
  'MAINTENANCE',
  'FUEL',
  'TIRE',
  'FINE',
  'REPAIR',
  'OTHER',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface EgressRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EgressRegistrationModal: React.FC<EgressRegistrationModalProps> = ({
  onClose,
  onSuccess,
}): React.ReactElement => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [form, setForm] = useState<{
    unitId: string;
    category: FinanceCategory | '';
    amount: string;
    vendor: string;
    invoiceRef: string;
    notes: string;
  }>({
    unitId: '',
    category: '',
    amount: '',
    vendor: '',
    invoiceRef: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  useEffect((): void => {
    api
      .get<{ success: boolean; data: FleetUnit[] }>('/fleet')
      .then((res) => setUnits(res.data.data ?? []))
      .catch((): void => setUnits([]));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldError?.field === name) setFieldError(null);
  };

  const validate = (): boolean => {
    if (!form.unitId) {
      setFieldError({ field: 'unitId', message: 'Selecciona una unidad' });
      return false;
    }
    if (!form.category) {
      setFieldError({ field: 'category', message: 'Selecciona una categoría' });
      return false;
    }
    const amt = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      setFieldError({ field: 'amount', message: 'El monto debe ser mayor a $0' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setFieldError(null);

    const payload: CreateTransactionPayload = {
      unitId: form.unitId,
      category: form.category as FinanceCategory,
      amount: parseFloat(form.amount),
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

  const inputCls = (field: string): string =>
    `w-full text-archon-label font-bold text-pinnacle-navy bg-white border rounded-[4px] px-3 py-2.5 focus:outline-none transition-colors duration-200 ${
      fieldError?.field === field
        ? 'border-sentinel-red focus:border-sentinel-red'
        : 'border-slate-200 focus:border-pinnacle-navy/30'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[4px] shadow-2xl w-full max-w-md mx-4 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-pinnacle-navy" />
            <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-[0.1em]">
              Registrar Egreso
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-pinnacle-navy/40 hover:text-sentinel-red hover:bg-red-50 transition-all duration-200 rounded-[4px]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Unidad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
              Unidad *
            </label>
            <select
              name="unitId"
              value={form.unitId}
              onChange={handleChange}
              className={inputCls('unitId')}
            >
              <option value="">Seleccionar unidad...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id} — {u.marca} {u.modelo}
                </option>
              ))}
            </select>
            {fieldError?.field === 'unitId' && (
              <p className="text-archon-base text-sentinel-red font-bold">{fieldError.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
              Categoría *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputCls('category')}
            >
              <option value="">Seleccionar categoría...</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {fieldError?.field === 'category' && (
              <p className="text-archon-base text-sentinel-red font-bold">{fieldError.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
              Monto (MXN) *
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className={inputCls('amount')}
            />
            {fieldError?.field === 'amount' && (
              <p className="text-archon-base text-sentinel-red font-bold">{fieldError.message}</p>
            )}
          </div>

          {/* Proveedor + Referencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
                Proveedor
              </label>
              <input
                type="text"
                name="vendor"
                value={form.vendor}
                onChange={handleChange}
                placeholder="Nombre del proveedor"
                maxLength={150}
                className={inputCls('vendor')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
                No. Factura
              </label>
              <input
                type="text"
                name="invoiceRef"
                value={form.invoiceRef}
                onChange={handleChange}
                placeholder="FAC-0001"
                maxLength={80}
                className={inputCls('invoiceRef')}
              />
            </div>
          </div>

          {/* Notas */}
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

          {/* Error general */}
          {fieldError && !['unitId', 'category', 'amount'].includes(fieldError.field) && (
            <p className="text-archon-md text-sentinel-red font-bold bg-red-50 px-3 py-2 rounded-[4px]">
              {fieldError.message}
            </p>
          )}

          {/* Actions */}
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
        </form>
      </div>
    </div>
  );
};

export default EgressRegistrationModal;
