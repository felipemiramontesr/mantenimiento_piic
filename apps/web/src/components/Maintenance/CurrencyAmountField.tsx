import React from 'react';

interface CurrencyAmountFieldProps {
  value: number;
  onChange: (value: number) => void;
}

/** Input de monto en MXN (símbolo `$` + sufijo `MXN`) compartido por
 * `FinancialPanel` (MaintenanceCompletionPanel) y `OperationalPanel`
 * (MaintenanceRegistrationForm) — extraído para extinguir la duplicación
 * de 23 líneas idénticas detectada por SonarCloud entre ambos archivos
 * (FC166 Track A.2, isomorfo — 0 cambio de comportamiento/markup). */
function CurrencyAmountField({ value, onChange }: CurrencyAmountFieldProps): React.JSX.Element {
  return (
    <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
      <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        placeholder="Ej: 3,450.00"
        className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
        value={value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(e.target.valueAsNumber)
        }
      />
      <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
        MXN
      </span>
    </div>
  );
}

export default CurrencyAmountField;
