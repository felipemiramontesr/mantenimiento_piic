import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface ArchonSelectProps {
  options: readonly (string | SelectOption)[] | (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}

/**
 * 🔱 Archon UI Component: Polymorphic Select
 * Evolution: v.21.2.0 - Supports both primitive strings and complex objects (Value/Label).
 */
export default function ArchonSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  icon: Icon,
  disabled = false,
}: ArchonSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Extract label for current value
  const currentLabel = (): string => {
    if (!value) return placeholder;
    const selected = options.find((opt) =>
      typeof opt === 'string' ? opt === value : opt.value === value
    );
    if (!selected) return value || placeholder;
    return typeof selected === 'string' ? selected : selected.label;
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

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Area */}
      <div
        className={`archon-select flex items-center justify-between transition-all duration-300 ${
          disabled ? 'opacity-40 cursor-not-allowed bg-[rgba(15,42,68,0.05)]' : 'cursor-pointer'
        } ${isOpen ? 'border-b-[#f2b705] bg-white' : ''}`}
        onClick={(): void => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        style={{
          borderBottom: isOpen ? '2px solid #f2b705' : '2px solid rgba(15, 42, 68, 0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon size={16} className={isOpen ? 'text-[#f2b705]' : 'text-[#0f2a44] opacity-40'} />
          )}
          <span className={!value ? 'text-[#0f2a44] opacity-20 font-medium' : 'text-[#0f2a44]'}>
            {currentLabel()}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
            className="absolute top-full left-0 w-full mt-2 bg-white border border-[rgba(15,42,68,0.1)] rounded-lg shadow-2xl z-[500] overflow-hidden"
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
            }}
          >
            {options.map((option, idx) => {
              const optValue = typeof option === 'string' ? option : option.value;
              const optLabel = typeof option === 'string' ? option : option.label;

              return (
                <div
                  key={`${optValue}-${idx}`}
                  onClick={(): void => {
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={`px-5 py-3.5 text-[13px] font-bold cursor-pointer transition-all duration-200 border-l-[3px] ${
                    value === optValue
                      ? 'border-[#f2b705] bg-[rgba(242,183,5,0.05)] text-[#f2b705]'
                      : 'border-transparent text-[#0f2a44] hover:bg-[rgba(15,42,68,0.02)] hover:border-[rgba(15,42,68,0.2)]'
                  }`}
                >
                  {optLabel}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
