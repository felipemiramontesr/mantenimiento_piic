import React, { useEffect, useState } from 'react';
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
  const [selectValue, setSelectValue] = useState('');

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

  const available = catalog.filter((opt) => !value.includes(opt.code));

  const handleAdd = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const code = e.target.value;
    if (code && !value.includes(code)) onChange([...value, code]);
    setSelectValue('');
  };

  const handleRemove = (code: string): void => {
    onChange(value.filter((c) => c !== code));
  };

  const labelFor = (code: string): string => catalog.find((o) => o.code === code)?.label ?? code;

  const renderDropdownArea = (): React.JSX.Element | null => {
    if (loading) {
      return <p className="text-xs text-archon-muted">Cargando especialidades...</p>;
    }
    if (available.length > 0) {
      return (
        <select
          className="w-full rounded-[4px] border border-slate-300 bg-white px-3 py-2 text-sm text-pinnacle-navy focus:outline-none focus:ring-2 focus:ring-pinnacle-navy/30"
          value={selectValue}
          onChange={handleAdd}
          data-testid="specialties-dropdown"
        >
          <option value="" disabled>
            + Agregar especialidad
          </option>
          {available.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    if (value.length > 0) {
      return <p className="text-xs text-archon-muted">Todas las especialidades seleccionadas.</p>;
    }
    return null;
  };

  return (
    <div data-testid="owner-especialidades-input" className="space-y-2">
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

      {renderDropdownArea()}
    </div>
  );
};

export default SpecialtiesSelect;
