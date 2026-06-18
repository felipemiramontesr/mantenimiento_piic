import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import api from '../../api/client';

interface SpecialtyOption {
  code: string;
  label: string;
}

interface SpecialtiesSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
}

const SpecialtiesSelect: React.FC<SpecialtiesSelectProps> = ({
  value,
  onChange,
}): React.JSX.Element => {
  const [catalog, setCatalog] = useState<SpecialtyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ success: boolean; data: SpecialtyOption[] }>('/catalogs/specialties')
      .then((res) => {
        if (!cancelled) setCatalog(res.data?.data ?? []);
      })
      .catch(() => {
        // catalog unavailable — input stays empty
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const available = catalog.filter((opt) => !value.includes(opt.code));

  const handleRemove = (code: string): void => {
    onChange(value.filter((c) => c !== code));
  };

  const labelFor = (code: string): string => catalog.find((o) => o.code === code)?.label ?? code;

  return (
    <div ref={containerRef} data-testid="owner-especialidades-input" className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="specialties-chips">
          {value.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-pinnacle-navy/10 text-pinnacle-navy text-xs font-semibold"
            >
              {labelFor(code)}
              <button
                type="button"
                aria-label={`Quitar ${labelFor(code)}`}
                className="text-pinnacle-navy/60 hover:text-pinnacle-navy cursor-pointer"
                onClick={(): void => handleRemove(code)}
                data-testid={`remove-specialty-${code}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!loading && available.length > 0 && (
        <div className="relative">
          <button
            type="button"
            data-testid="specialties-dropdown-trigger"
            onClick={(): void => setOpen((o) => !o)}
            className="w-full h-11 flex items-center justify-between px-4 rounded-[4px] bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 text-[13px] font-bold text-[#0f2a44]/50 hover:bg-[#0f2a44]/[0.08] transition-all duration-300"
          >
            <span>+ Agregar especialidad</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div
              data-testid="specialties-dropdown"
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#0f2a44]/10 rounded-[4px] shadow-[0_4px_16px_rgba(15,42,68,0.12)] overflow-y-auto max-h-60"
            >
              {available.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  data-testid={`specialty-option-${opt.code}`}
                  onClick={(): void => {
                    onChange([...value, opt.code]);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-[#0f2a44] hover:bg-[#0f2a44]/[0.06] transition-colors duration-150"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpecialtiesSelect;
