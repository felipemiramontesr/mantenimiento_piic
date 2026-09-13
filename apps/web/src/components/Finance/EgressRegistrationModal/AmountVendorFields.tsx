import React from 'react';
import { DollarSign, Building2, FileText } from 'lucide-react';
import { EgressFormData, FieldError } from './types';
import ArchonField from '../../ArchonField';

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
  <ArchonField label="Monto (MXN)" icon={DollarSign} required>
    <input
      id="egress-amount"
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
      <p className="text-archon-base text-red-600 font-bold">{fieldError.message}</p>
    )}
  </ArchonField>
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
    <ArchonField label="Proveedor" icon={Building2}>
      <input
        id="egress-vendor"
        type="text"
        name="vendor"
        value={vendor}
        onChange={handleChange}
        placeholder="Nombre del proveedor"
        maxLength={150}
        className={inputCls('vendor')}
      />
    </ArchonField>
    <ArchonField label="No. Factura" icon={FileText}>
      <input
        id="egress-invoice-ref"
        type="text"
        name="invoiceRef"
        value={invoiceRef}
        onChange={handleChange}
        placeholder="FAC-0001"
        maxLength={80}
        className={inputCls('invoiceRef')}
      />
    </ArchonField>
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
