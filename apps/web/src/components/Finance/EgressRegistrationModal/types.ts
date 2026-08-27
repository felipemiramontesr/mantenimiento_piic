import { FinanceCategory } from '../../../types/finance';

export const ALL_CATEGORIES: FinanceCategory[] = [
  'LEASE',
  'INSURANCE',
  'MAINTENANCE',
  'FUEL',
  'TIRE',
  'FINE',
  'REPAIR',
  'OTHER',
];

export interface EgressFormData {
  unitId: string;
  category: FinanceCategory | '';
  amount: string;
  vendor: string;
  invoiceRef: string;
  notes: string;
}

export const EMPTY_EGRESS_FORM: EgressFormData = {
  unitId: '',
  category: '',
  amount: '',
  vendor: '',
  invoiceRef: '',
  notes: '',
};

export interface FieldError {
  field: string;
  message: string;
}
