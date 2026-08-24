import { FinanceCategory } from '../../../types/finance';
import { ArchonTableHeader } from '../../UI/ArchonDataTable';

export const CATEGORY_BADGE: Record<FinanceCategory, string> = {
  LEASE: 'bg-pinnacle-navy/10 text-pinnacle-navy',
  INSURANCE: 'bg-sky-100 text-sky-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  FUEL: 'bg-emerald-100 text-emerald-700',
  TIRE: 'bg-violet-100 text-violet-700',
  FINE: 'bg-red-100 text-red-700',
  REPAIR: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

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

// FC 078 F3 — columnas de la tabla migrada a ArchonDataTable (misma data,
// mismo orden que la tabla artesanal que sustituye).
export const HEADERS: ArchonTableHeader[] = [
  { key: 'unidad', label: 'Unidad', align: 'center' },
  { key: 'categoria', label: 'Categoría', align: 'center' },
  { key: 'monto', label: 'Monto', align: 'center' },
  { key: 'concepto', label: 'Concepto', align: 'center' },
  { key: 'origen', label: 'Origen', align: 'center' },
  { key: 'fecha', label: 'Fecha', align: 'center' },
];
