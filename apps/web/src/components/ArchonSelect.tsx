import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import type { SelectOption } from './ArchonSelect/types';
import { ArchonSelectOptionItem } from './ArchonSelect/ArchonSelectOptionItem';
import { useArchonSelectState } from './ArchonSelect/hooks';

export type { SelectOption };

interface ArchonSelectProps {
  options: readonly (string | SelectOption)[] | (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  searchable?: boolean;
}

interface ArchonSelectTriggerProps {
  disabled: boolean;
  isOpen: boolean;
  Icon?: React.ElementType;
  currentLabel: string;
  hasValue: boolean;
  onToggle: () => void;
}

/** className del contenedor disparador (FC163 F1B-2, split Alfa 219_AN — sub-split de ArchonSelectTrigger). */
function archonSelectTriggerClassName(disabled: boolean, isOpen: boolean): string {
  return `w-full h-11 bg-[#0f2a44]/5 px-4 flex items-center justify-between transition-all duration-300 rounded-[4px] ${
    disabled
      ? 'opacity-40 cursor-not-allowed bg-[rgba(15,42,68,0.05)]'
      : 'cursor-pointer hover:bg-[#0f2a44]/8'
  } ${isOpen ? 'border-b-[#f2b705] bg-white shadow-[0_4px_12px_rgba(15,42,68,0.05)]' : ''}`;
}

/** Área disparadora del combobox (FC163 F1B-2, split Alfa 219_AN). */
function ArchonSelectTrigger({
  disabled,
  isOpen,
  Icon,
  currentLabel,
  hasValue,
  onToggle,
}: ArchonSelectTriggerProps): React.JSX.Element {
  return (
    <div
      className={archonSelectTriggerClassName(disabled, isOpen)}
      onClick={onToggle}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      style={{
        borderBottom: isOpen ? '2px solid #f2b705' : '2px solid rgba(15, 42, 68, 0.1)',
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {Icon && (
          <Icon size={16} className={isOpen ? 'text-[#f2b705]' : 'text-[#0f2a44] opacity-40'} />
        )}
        <span
          className={`truncate text-archon-lg font-bold ${
            !hasValue ? 'text-[#0f2a44] opacity-30' : 'text-[#0f2a44]'
          }`}
        >
          {currentLabel}
        </span>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0 ml-2"
      >
        <ChevronDown
          size={14}
          className={isOpen ? 'text-[#f2b705]' : 'text-[#0f2a44] opacity-30'}
        />
      </motion.div>
    </div>
  );
}

interface ArchonSelectSearchBoxProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** Caja de búsqueda del dropdown (FC163 F1B-2, split Alfa 219_AN). */
function ArchonSelectSearchBox({
  searchTerm,
  onSearchChange,
  onClearSearch,
  inputRef,
}: ArchonSelectSearchBoxProps): React.JSX.Element {
  return (
    <div className="p-2 border-b border-[rgba(15,42,68,0.05)] bg-gray-50 flex items-center gap-2">
      <Search size={14} className="text-[#0f2a44] opacity-30" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar..."
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onSearchChange(e.target.value)}
        className="w-full bg-transparent border-none outline-none text-archon-lg font-bold text-[#0f2a44] placeholder:opacity-30"
        onClick={(e: React.MouseEvent): void => e.stopPropagation()}
      />
      {searchTerm && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onClearSearch();
          }}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X size={12} className="text-[#0f2a44] opacity-40" />
        </button>
      )}
    </div>
  );
}

interface ArchonSelectOptionsListProps {
  filteredOptions: SelectOption[];
  value: string;
  searchTerm: string;
  onSelect: (v: string) => void;
}

/** Lista de opciones filtradas (o mensaje vacío) del dropdown (FC163 F1B-2, split Alfa 219_AN). */
function ArchonSelectOptionsList({
  filteredOptions,
  value,
  searchTerm,
  onSelect,
}: ArchonSelectOptionsListProps): React.JSX.Element {
  return (
    <div className="overflow-y-auto flex-1 custom-scrollbar">
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option, idx) => (
          <ArchonSelectOptionItem
            key={`${option.value}-${idx}`}
            option={option}
            isSelected={value === option.value}
            onSelect={onSelect}
          />
        ))
      ) : (
        <div className="px-5 py-10 text-center text-[#0f2a44] opacity-40 text-xs italic">
          No se encontraron coincidencias para &quot;{searchTerm}&quot;
        </div>
      )}
    </div>
  );
}

interface ArchonSelectDropdownProps {
  dropdownStyle: React.CSSProperties;
  searchable: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  filteredOptions: SelectOption[];
  value: string;
  onSelect: (v: string) => void;
}

/** Panel desplegable (buscador + lista de opciones) renderizado en el portal (FC163 F1B-2, split Alfa 219_AN). */
function ArchonSelectDropdown({
  dropdownStyle,
  searchable,
  searchTerm,
  onSearchChange,
  onClearSearch,
  inputRef,
  filteredOptions,
  value,
  onSelect,
}: ArchonSelectDropdownProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...dropdownStyle, maxHeight: '350px' }}
      className="bg-white border border-[rgba(15,42,68,0.1)] rounded-[4px] shadow-2xl overflow-hidden flex flex-col"
    >
      {searchable && (
        <ArchonSelectSearchBox
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          inputRef={inputRef}
        />
      )}
      <ArchonSelectOptionsList
        filteredOptions={filteredOptions}
        value={value}
        searchTerm={searchTerm}
        onSelect={onSelect}
      />
    </motion.div>
  );
}

interface ArchonSelectPortalDropdownProps {
  portalRoot: HTMLElement | null;
  isOpen: boolean;
  dropdownStyle: React.CSSProperties;
  searchable: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  filteredOptions: SelectOption[];
  value: string;
  onSelect: (v: string) => void;
}

/** Envuelve ArchonSelectDropdown en su portal + transición de entrada/salida (FC163 F1B-2, split Alfa 219_AN). */
function ArchonSelectPortalDropdown({
  portalRoot,
  isOpen,
  dropdownStyle,
  searchable,
  searchTerm,
  onSearchChange,
  onClearSearch,
  inputRef,
  filteredOptions,
  value,
  onSelect,
}: ArchonSelectPortalDropdownProps): React.ReactPortal | null {
  if (!portalRoot) return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <ArchonSelectDropdown
          dropdownStyle={dropdownStyle}
          searchable={searchable}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          inputRef={inputRef}
          filteredOptions={filteredOptions}
          value={value}
          onSelect={onSelect}
        />
      )}
    </AnimatePresence>,
    portalRoot
  );
}

/**
 * 🔱 Archon UI Component: Intelligent Combobox (v.23.0.0 — Portal Architecture)
 * Evolution: Dropdown now renders via React Portal to document.body, completely
 * escaping parent overflow/stacking contexts. Positioned dynamically via
 * getBoundingClientRect for pixel-perfect alignment at any nesting depth.
 */
export default function ArchonSelect({
  options,
  value,
  onChange,
  placeholder: placeholderProp = 'Seleccionar...',
  icon: Icon,
  disabled = false,
  searchable = true,
}: ArchonSelectProps): React.JSX.Element {
  const {
    isOpen,
    searchTerm,
    setSearchTerm,
    containerRef,
    inputRef,
    filteredOptions,
    currentLabel,
    dropdownStyle,
    portalRoot,
    handleToggle,
    handleSelect,
  } = useArchonSelectState(options, value, onChange, placeholderProp, disabled, searchable);

  return (
    <div className="relative w-full" ref={containerRef}>
      <ArchonSelectTrigger
        disabled={disabled}
        isOpen={isOpen}
        Icon={Icon}
        currentLabel={currentLabel}
        hasValue={Boolean(value)}
        onToggle={handleToggle}
      />
      <ArchonSelectPortalDropdown
        portalRoot={portalRoot}
        isOpen={isOpen}
        dropdownStyle={dropdownStyle}
        searchable={searchable}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={(): void => setSearchTerm('')}
        inputRef={inputRef}
        filteredOptions={filteredOptions}
        value={value}
        onSelect={handleSelect}
      />
    </div>
  );
}
