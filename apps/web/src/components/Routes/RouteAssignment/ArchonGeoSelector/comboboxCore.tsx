import React, { useEffect } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { ComboboxOptionItemData } from './types';

/** Cierra el combobox al hacer click fuera de su contenedor (FC163 F1B-2, split Alfa 219_AN). */
export function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void): void {
  useEffect((): (() => void) => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return (): void => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

interface ComboboxTriggerProps {
  disabled: boolean;
  isOpen: boolean;
  selectedLabel: string;
  placeholderText: string;
  onClick: () => void;
}

/** Área disparadora del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
export function ComboboxTrigger({
  disabled,
  isOpen,
  selectedLabel,
  placeholderText,
  onClick,
}: ComboboxTriggerProps): React.JSX.Element {
  return (
    <div
      className={`w-full h-11 bg-[#0f2a44]/5 px-4 flex items-center justify-between transition-all duration-300 rounded-[4px] border-b-2 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-[#0f2a44]/8'
      } ${
        isOpen
          ? 'border-[#f2b705] bg-white shadow-[0_4px_12px_rgba(15,42,68,0.05)]'
          : 'border-[#0f2a44]/10'
      }`}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span
        className={`truncate text-archon-lg font-bold ${
          !selectedLabel ? 'text-[#0f2a44] opacity-30' : 'text-[#0f2a44]'
        }`}
      >
        {selectedLabel || placeholderText}
      </span>
      <ChevronDown
        size={14}
        className={`shrink-0 ml-2 transition-transform duration-300 ${
          isOpen ? 'text-[#f2b705] rotate-180' : 'text-[#0f2a44] opacity-30'
        }`}
      />
    </div>
  );
}

interface ComboboxOptionItemProps {
  item: ComboboxOptionItemData;
  onSelect: (id: number, label: string) => void;
}

/** Ítem individual de resultado del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
export function ComboboxOptionItem({ item, onSelect }: ComboboxOptionItemProps): React.JSX.Element {
  return (
    <div
      onClick={(e): void => {
        e.stopPropagation();
        onSelect(item.id, item.label);
      }}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(item.id, item.label);
        }
      }}
      role="option"
      aria-selected={item.isSelected}
      tabIndex={0}
      className={`px-5 py-2.5 text-archon-lg font-bold cursor-pointer transition-all duration-200 border-l-[3px] flex items-center justify-between gap-4 ${
        item.isSelected
          ? 'border-[#f2b705] bg-[#f2b705]/5 text-[#f2b705]'
          : 'border-transparent text-[#0f2a44] hover:bg-[#0f2a44]/2'
      }`}
    >
      <div className="flex flex-col min-w-0">
        <span className="truncate">{item.label}</span>
        {item.secondary && (
          <span className="text-archon-sm font-black opacity-30 uppercase tracking-widest truncate mt-0.5">
            {item.secondary}
          </span>
        )}
      </div>
      {item.isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705] shrink-0" />}
    </div>
  );
}

interface ComboboxDropdownPanelProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  items: ComboboxOptionItemData[];
  onSelect: (id: number, label: string) => void;
}

/** Panel desplegable (buscador + lista) del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
export function ComboboxDropdownPanel({
  searchTerm,
  onSearchChange,
  loading,
  inputRef,
  items,
  onSelect,
}: ComboboxDropdownPanelProps): React.JSX.Element {
  return (
    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-[#0f2a44]/10 rounded-[4px] shadow-2xl z-[500] flex flex-col max-h-[250px]">
      <div className="p-2 border-b border-[#0f2a44]/5 bg-gray-50 flex items-center gap-2">
        <Search size={14} className="text-[#0f2a44] opacity-30" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e): void => onSearchChange(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-archon-lg font-bold text-[#0f2a44] placeholder:opacity-30"
          onClick={(e): void => e.stopPropagation()}
        />
        {loading && <Loader2 size={12} className="animate-spin text-[#0f2a44]/40" />}
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[180px]">
        {items.length > 0 ? (
          items.map((item) => <ComboboxOptionItem key={item.key} item={item} onSelect={onSelect} />)
        ) : (
          <div className="px-5 py-6 text-center text-[#0f2a44] opacity-40 text-xs italic">
            No se encontraron resultados
          </div>
        )}
      </div>
    </div>
  );
}
