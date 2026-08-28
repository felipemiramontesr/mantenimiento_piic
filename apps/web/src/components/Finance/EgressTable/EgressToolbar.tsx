import React from 'react';
import { Download, Plus, ChevronDown, Search, X } from 'lucide-react';
import { FinanceCategory, CATEGORY_LABELS } from '../../../types/finance';
import { UnitSuggestionItem } from './UnitSuggestionItem';
import { ALL_CATEGORIES } from './constants';

interface UnitSuggestionsListProps {
  suggestions: string[];
  onSelectUnit: (unit: string) => void;
}

/** Lista desplegable de sugerencias de unidad (FC163 F1B-3, split Alfa 219_AN — sub-split de UnitSearchBox). */
function UnitSuggestionsList({
  suggestions,
  onSelectUnit,
}: UnitSuggestionsListProps): React.JSX.Element {
  return (
    <ul
      style={{ border: '1px solid rgba(15, 42, 68, 0.2)', borderRadius: '4px' }}
      className="absolute left-0 right-0 top-full mt-1.5 bg-white shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {suggestions.map((unit) => (
        <UnitSuggestionItem key={unit} unit={unit} onSelect={onSelectUnit} />
      ))}
    </ul>
  );
}

interface UnitSearchBoxProps {
  searchRef: React.RefObject<HTMLDivElement>;
  unitSearch: string;
  onSearchChange: (v: string) => void;
  onOpen: () => void;
  onCloseOnEscape: () => void;
  onClear: () => void;
  searchOpen: boolean;
  suggestions: string[];
  onSelectUnit: (unit: string) => void;
}

/** Autocompletado de búsqueda por unidad (FC163 F1B-3, split Alfa 219_AN — sub-split de EgressToolbar). */
function UnitSearchBox({
  searchRef,
  unitSearch,
  onSearchChange,
  onOpen,
  onCloseOnEscape,
  onClear,
  searchOpen,
  suggestions,
  onSelectUnit,
}: UnitSearchBoxProps): React.JSX.Element {
  return (
    <div ref={searchRef} className="relative w-full group">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <Search
          size={13}
          className="text-slate-400 group-focus-within:text-[#0f2a44] transition-colors duration-300"
        />
      </span>
      <input
        type="text"
        value={unitSearch}
        placeholder="Buscar unidad..."
        onChange={(e): void => onSearchChange(e.target.value)}
        onFocus={onOpen}
        onKeyDown={(e): void => {
          if (e.key === 'Escape') onCloseOnEscape();
        }}
        style={{ border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px' }}
        className="w-full pl-9 pr-9 py-3 text-archon-md font-bold text-[#0f2a44] bg-white focus:outline-none placeholder:text-slate-400/80 tracking-[0.02em] shadow-sm shadow-slate-100/50"
      />
      {unitSearch && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sentinel-red border-none bg-transparent cursor-pointer transition-colors duration-200 active:scale-95"
        >
          <X size={13} />
        </button>
      )}
      {searchOpen && suggestions.length > 0 && (
        <UnitSuggestionsList suggestions={suggestions} onSelectUnit={onSelectUnit} />
      )}
    </div>
  );
}

interface CategoryFilterSelectProps {
  categoryFilter: FinanceCategory | '';
  onChange: (c: FinanceCategory | '') => void;
}

/** Filtro de categoría (FC163 F1B-3, split Alfa 219_AN — sub-split de EgressToolbar). */
function CategoryFilterSelect({
  categoryFilter,
  onChange,
}: CategoryFilterSelectProps): React.JSX.Element {
  return (
    <div className="relative w-full">
      <select
        value={categoryFilter}
        onChange={(e): void => onChange(e.target.value as FinanceCategory | '')}
        style={{ border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px' }}
        className="appearance-none w-full pl-4 pr-8 py-3 text-archon-md font-bold text-[#0f2a44] bg-white focus:outline-none cursor-pointer shadow-sm shadow-slate-100/50 tracking-[0.02em]"
      >
        <option value="">Todas las categorías</option>
        {ALL_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
    </div>
  );
}

interface ToolbarActionsProps {
  total: number;
  onExport: () => void;
  exporting: boolean;
  onRegister: () => void;
}

/** Contador + botones de exportar/registrar (FC163 F1B-3, split Alfa 219_AN — sub-split de EgressToolbar). */
function ToolbarActions({
  total,
  onExport,
  exporting,
  onRegister,
}: ToolbarActionsProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-archon-base font-bold text-pinnacle-navy/40 uppercase tracking-widest">
        {total} registro{total !== 1 ? 's' : ''}
      </span>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        title="Exportar CSV"
        className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
      >
        <Download size={18} className="transition-transform duration-300" />
      </button>
      <button
        type="button"
        onClick={onRegister}
        title="Registrar egreso"
        className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
      >
        <Plus size={18} className="transition-transform duration-300" />
      </button>
    </div>
  );
}

export interface EgressToolbarProps {
  searchRef: React.RefObject<HTMLDivElement>;
  unitSearch: string;
  onUnitSearchChange: (v: string) => void;
  onOpenSearch: () => void;
  onCloseSearchOnEscape: () => void;
  onClearUnit: () => void;
  searchOpen: boolean;
  suggestions: string[];
  onSelectUnit: (unit: string) => void;
  categoryFilter: FinanceCategory | '';
  onCategoryChange: (c: FinanceCategory | '') => void;
  total: number;
  onExport: () => void;
  exporting: boolean;
  onRegister: () => void;
}

/** Barra de filtros + acciones de la tabla de egresos (FC163 F1B-3, split Alfa 219_AN). */
export function EgressToolbar({
  searchRef,
  unitSearch,
  onUnitSearchChange,
  onOpenSearch,
  onCloseSearchOnEscape,
  onClearUnit,
  searchOpen,
  suggestions,
  onSelectUnit,
  categoryFilter,
  onCategoryChange,
  total,
  onExport,
  exporting,
  onRegister,
}: EgressToolbarProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-10">
      <div className="flex flex-col gap-2">
        <UnitSearchBox
          searchRef={searchRef}
          unitSearch={unitSearch}
          onSearchChange={onUnitSearchChange}
          onOpen={onOpenSearch}
          onCloseOnEscape={onCloseSearchOnEscape}
          onClear={onClearUnit}
          searchOpen={searchOpen}
          suggestions={suggestions}
          onSelectUnit={onSelectUnit}
        />
        <CategoryFilterSelect categoryFilter={categoryFilter} onChange={onCategoryChange} />
      </div>
      <ToolbarActions
        total={total}
        onExport={onExport}
        exporting={exporting}
        onRegister={onRegister}
      />
    </div>
  );
}
