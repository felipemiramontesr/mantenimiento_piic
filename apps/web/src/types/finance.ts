export interface DateRange {
  from: string;
  to: string;
}

export type FinanceCategory =
  | 'LEASE'
  | 'INSURANCE'
  | 'MAINTENANCE'
  | 'FUEL'
  | 'TIRE'
  | 'FINE'
  | 'REPAIR'
  | 'OTHER';

export type TransactionSource = 'AUTO' | 'MANUAL';

export interface FinancialTransaction {
  id: number;
  uuid: string;
  unit_id: number;
  unit_name: string;
  category: FinanceCategory;
  amount: number;
  period: string;
  source: TransactionSource;
  vendor: string | null;
  invoice_ref: string | null;
  notes: string | null;
  created_by_name: string;
  created_at: string;
}

export interface FinanceDashboardKpis {
  totalEgresos: number;
  totalLease: number;
  totalMaintenance: number;
  totalFuel: number;
  totalInsurance: number;
  totalTire: number;
  totalFine: number;
  totalRepair: number;
  totalOther: number;
  unitCount: number;
  avgCostPerUnit: number;
}

export interface CategoryBreakdown {
  category: FinanceCategory;
  amount: number;
}

export interface MonthlyTrend {
  period: string;
  amount: number;
}

export interface TopUnit {
  unitId: number;
  unitName: string;
  amount: number;
}

export interface FinanceDashboardData {
  from: string;
  to: string;
  kpis: FinanceDashboardKpis;
  byCategory: CategoryBreakdown[];
  byMonth: MonthlyTrend[];
  topUnits: TopUnit[];
}

export interface CreateTransactionPayload {
  unitId: string;
  category: FinanceCategory;
  amount: number;
  vendor?: string | null;
  invoiceRef?: string | null;
  notes?: string | null;
}

export const CATEGORY_LABELS: Record<FinanceCategory, string> = {
  LEASE: 'Arrendamiento',
  INSURANCE: 'Seguro',
  MAINTENANCE: 'Mantenimiento',
  FUEL: 'Combustible',
  TIRE: 'Llanta',
  FINE: 'Multa / Infracción',
  REPAIR: 'Reparación',
  OTHER: 'Otro',
};

export const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  LEASE: '#0f2a44',
  INSURANCE: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  FUEL: '#10b981',
  TIRE: '#8b5cf6',
  FINE: '#C12020',
  REPAIR: '#f97316',
  OTHER: '#94a3b8',
};
