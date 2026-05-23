import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchTerms?: string; // Optional field to include more keywords in search
}

interface ArchonSelectProps {
  options: readonly (string | SelectOption)[] | (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  searchable?: boolean;
}

/**
 * 🔱 Archon UI Component: Intelligent Combobox (v.22.0.0)
 * Evolution: Now supports real-time fuzzy search and secondary metadata.
 */
export default function ArchonSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  icon: Icon,
  disabled = false,
  searchable = true,
}: ArchonSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to object format
  const normalizedOptions = useMemo(
    () =>
      options.map((opt) => {
        if (typeof opt === 'string') return { value: opt, label: opt };
        return opt;
      }),
    [options]
  );

  // Fuzzy Search Filter
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter((opt) => {
      const searchStr = `${opt.label} ${opt.secondaryLabel || ''} ${opt.searchTerms || ''} ${
        opt.value
      }`.toLowerCase();
      return searchStr.includes(term);
    });
  }, [normalizedOptions, searchTerm]);

  // Helper: Extract label for current value
  const currentLabel = (): string => {
    if (!value) return placeholder;
    const selected = normalizedOptions.find((opt) => opt.value === value);
    return selected ? selected.label : value || placeholder;
  };

  // Close on outside click
  useEffect((): (() => void) => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (searchable) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, searchable]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Area */}
      <div
        className={`w-full h-11 bg-[#0f2a44]/5 px-4 flex items-center justify-between transition-all duration-300 rounded-[4px] ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-[rgba(15,42,68,0.05)]'
            : 'cursor-pointer hover:bg-[#0f2a44]/8'
        } ${isOpen ? 'border-b-[#f2b705] bg-white shadow-[0_4px_12px_rgba(15,42,68,0.05)]' : ''}`}
        onClick={(): void => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        style={{
          borderBottom: isOpen ? '2px solid #f2b705' : '2px solid rgba(15, 42, 68, 0.1)',
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {Icon && (
            <Icon size={16} className={isOpen ? 'text-[#f2b705]' : 'text-[#0f2a44] opacity-40'} />
          )}
          <span
            className={`truncate text-[13px] font-bold ${
              !value ? 'text-[#0f2a44] opacity-30' : 'text-[#0f2a44]'
            }`}
          >
            {currentLabel()}
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

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 w-full mt-2 bg-white border border-[rgba(15,42,68,0.1)] rounded-[4px] shadow-2xl z-[500] overflow-hidden flex flex-col"
            style={{ maxHeight: '350px' }}
          >
            {/* Search Input Box */}
            {searchable && (
              <div className="p-2 border-b border-[rgba(15,42,68,0.05)] bg-gray-50 flex items-center gap-2">
                <Search size={14} className="text-[#0f2a44] opacity-30" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full bg-transparent border-none outline-none text-[13px] font-bold text-[#0f2a44] placeholder:opacity-30"
                  onClick={(e: React.MouseEvent): void => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent): void => {
                      e.stopPropagation();
                      setSearchTerm('');
                    }}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X size={12} className="text-[#0f2a44] opacity-40" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isSelected = value === option.value;

                  return (
                    <div
                      key={`${option.value}-${idx}`}
                      onClick={(e): void => {
                        e.stopPropagation();
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`px-5 py-3 text-[13px] font-bold cursor-pointer transition-all duration-200 border-l-[3px] flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-[#f2b705] bg-[rgba(242,183,5,0.05)] text-[#f2b705]'
                          : 'border-transparent text-[#0f2a44] hover:bg-[rgba(15,42,68,0.02)] hover:border-[rgba(15,42,68,0.2)]'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.secondaryLabel && (
                          <div className="text-[9px] font-black opacity-30 uppercase tracking-widest truncate mt-0.5">
                            {option.secondaryLabel}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705] shrink-0 shadow-[0_0_8px_rgba(242,183,5,0.6)]" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-10 text-center text-[#0f2a44] opacity-40 text-xs italic">
                  No se encontraron coincidencias para &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
