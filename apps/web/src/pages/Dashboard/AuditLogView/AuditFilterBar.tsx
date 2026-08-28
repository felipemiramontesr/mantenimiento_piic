import React from 'react';
import { Filters, ENTITY_OPTIONS, ACTION_OPTIONS, LABEL_CLS } from './types';

interface FilterSelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  testId: string;
  onChange: (v: string) => void;
}

/** Campo de filtro tipo select (entidad/acción) (FC163 F2B4 Sub-Batch 4B-2). */
function FilterSelectField({
  label,
  value,
  options,
  testId,
  onChange,
}: FilterSelectFieldProps): React.ReactElement {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <select
        className="archon-input"
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        data-testid={testId}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterDateFieldProps {
  label: string;
  value: string;
  testId: string;
  onChange: (v: string) => void;
}

/** Campo de filtro tipo fecha (desde/hasta) (FC163 F2B4 Sub-Batch 4B-2). */
function FilterDateField({
  label,
  value,
  testId,
  onChange,
}: FilterDateFieldProps): React.ReactElement {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        type="date"
        className="archon-input"
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        data-testid={testId}
      />
    </div>
  );
}

interface AuditFilterBarProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
}

/** Filtros de entidad, acción y rango de fechas del historial de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
function AuditFilterBar({ filters, setFilters, onApply }: AuditFilterBarProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 items-end">
      <FilterSelectField
        label="Tipo de Entidad"
        value={filters.entity_type}
        options={ENTITY_OPTIONS}
        testId="filter-entity-type"
        onChange={(v): void => setFilters((f) => ({ ...f, entity_type: v }))}
      />
      <FilterSelectField
        label="Acción"
        value={filters.action}
        options={ACTION_OPTIONS}
        testId="filter-action"
        onChange={(v): void => setFilters((f) => ({ ...f, action: v }))}
      />
      <FilterDateField
        label="Desde"
        value={filters.date_from}
        testId="filter-date-from"
        onChange={(v): void => setFilters((f) => ({ ...f, date_from: v }))}
      />
      <FilterDateField
        label="Hasta"
        value={filters.date_to}
        testId="filter-date-to"
        onChange={(v): void => setFilters((f) => ({ ...f, date_to: v }))}
      />
      <button
        type="button"
        onClick={onApply}
        className="col-span-2 lg:col-span-4 w-full h-11 flex items-center justify-center rounded-[4px] bg-pinnacle-navy text-pinnacle-yellow text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
        data-testid="filter-apply"
      >
        Aplicar Filtros
      </button>
    </div>
  );
}

export default AuditFilterBar;
