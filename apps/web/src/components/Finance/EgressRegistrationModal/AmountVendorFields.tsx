import React from 'react';
import { EgressFormData, FieldError } from './types';

type EgressChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => void;

export interface AmountVendorFieldsProps {
  form: EgressFormData;
  fieldError: FieldError | null;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

interface AmountFieldProps {
  amount: string;
  fieldError: FieldError | null;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

/** Campo de Monto (MXN) (FC163 F2B3, split de EgressRegistrationModal). */
const AmountField: React.FC<AmountFieldProps> = ({
  amount,
  fieldError,
  handleChange,
  inputCls,
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
      Monto (MXN) *
    </label>
    <input
      type="number"
      name="amount"
      value={amount}
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
);

interface VendorInvoiceFieldsProps {
  vendor: string;
  invoiceRef: string;
  handleChange: EgressChangeHandler;
  inputCls: (field: string) => string;
}

/** Campos de Proveedor + No. Factura (FC163 F2B3, split de EgressRegistrationModal). */
const VendorInvoiceFields: React.FC<VendorInvoiceFieldsProps> = ({
  vendor,
  invoiceRef,
  handleChange,
  inputCls,
}) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="flex flex-col gap-1.5">
      <label className="text-archon-base font-black uppercase tracking-[0.15em] text-pinnacle-navy/50">
        Proveedor
      </label>
      <input
        type="text"
        name="vendor"
        value={vendor}
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
        value={invoiceRef}
        onChange={handleChange}
        placeholder="FAC-0001"
        maxLength={80}
        className={inputCls('invoiceRef')}
      />
    </div>
  </div>
);

/** Monto + Proveedor + No. Factura (FC163 F2B3, split de EgressRegistrationModal). */
export const AmountVendorFields: React.FC<AmountVendorFieldsProps> = ({
  form,
  fieldError,
  handleChange,
  inputCls,
}) => (
  <>
    <AmountField
      amount={form.amount}
      fieldError={fieldError}
      handleChange={handleChange}
      inputCls={inputCls}
    />
    <VendorInvoiceFields
      vendor={form.vendor}
      invoiceRef={form.invoiceRef}
      handleChange={handleChange}
      inputCls={inputCls}
    />
  </>
);
