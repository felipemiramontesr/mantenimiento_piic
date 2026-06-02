import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, List, LayoutDashboard } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import FinancialDashboard from '../../components/Finance/FinancialDashboard';
import EgressTable from '../../components/Finance/EgressTable';
import { FinanceCategory, DateRange } from '../../types/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'archon_finance_date_range';

function defaultDateRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-01-01`, to: `${y}-${m}-${d}` };
}

function loadDateRange(): DateRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDateRange();
    const parsed = JSON.parse(raw) as DateRange;
    if (parsed.from && parsed.to) return parsed;
  } catch {
    // ignore corrupt storage
  }
  return defaultDateRange();
}

function saveDateRange(range: DateRange): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  } catch {
    // ignore storage quota errors
  }
}

export type FinancialPanel = 'DASHBOARD' | 'EGRESOS';

// ─── Module ───────────────────────────────────────────────────────────────────

const FinancialHealthModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<FinancialPanel>('DASHBOARD');
  const [dateRange, setDateRange] = useState<DateRange>(loadDateRange);
  const [egressCategory, setEgressCategory] = useState<FinanceCategory | ''>('');

  const handleNavigateToEgresos = (category?: FinanceCategory): void => {
    setEgressCategory(category ?? '');
    setActivePanel('EGRESOS');
  };

  const isEgresos = activePanel === 'EGRESOS';

  useEffect((): void => {
    setSectionData('Finanzas', 'Control de Egresos y Salud Financiera de la Flotilla', null, {
      variant: isEgresos ? 'emerald' : 'navy',
      headerTitle: isEgresos ? 'Registro de Egresos' : 'Dashboard Financiero',
      HeaderIcon: isEgresos ? List : LayoutDashboard,
      PayloadIcon: isEgresos ? DollarSign : BarChart3,
      actionTitle: isEgresos ? 'Egresos' : 'Dashboard',
      description: isEgresos ? 'Historial de transacciones' : 'Inteligencia económica',
      buttonText: isEgresos ? 'Ver Dashboard' : 'Ver Egresos',
      isActive: isEgresos,
      onClick: (): void => setActivePanel(isEgresos ? 'DASHBOARD' : 'EGRESOS'),
    });
  }, [setSectionData, isEgresos]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          {activePanel === 'DASHBOARD' && (
            <FinancialDashboard
              dateRange={dateRange}
              onDateRangeChange={(range): void => {
                setDateRange(range);
                saveDateRange(range);
              }}
              onNavigateToEgresos={handleNavigateToEgresos}
            />
          )}
          {activePanel === 'EGRESOS' && (
            <EgressTable
              key={egressCategory}
              from={dateRange.from}
              to={dateRange.to}
              initialCategory={egressCategory}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default FinancialHealthModule;
