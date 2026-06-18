import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AREA_CATALOG = [
  'Administración',
  'Dirección General',
  'Finanzas',
  'Contabilidad',
  'Auditoría',
  'Jurídico / Legal',
  'Recursos Humanos',
  'Nómina',
  'Operaciones',
  'Mantenimiento',
  'Flota',
  'Logística',
  'Distribución',
  'Transporte',
  'Almacén',
  'Compras',
  'Calidad',
  'Producción',
  'Ventas',
  'Servicio al Cliente',
  'Marketing',
  'Sistemas / TI',
] as const;

const OTRO = 'Otro';

interface AreasSelectProps {
  value: string[];
  onChange: (areas: string[]) => void;
}

const AreasSelect: React.FC<AreasSelectProps> = ({ value, onChange }): React.JSX.Element => {
  const [open, setOpen] = useState(false);
  const [otroInput, setOtroInput] = useState('');
  const [showOtro, setShowOtro] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  const available = AREA_CATALOG.filter((a) => !value.includes(a));

  const handleSelect = (area: string): void => {
    if (area === OTRO) {
      setShowOtro(true);
      setOpen(false);
      return;
    }
    if (!value.includes(area)) onChange([...value, area]);
    setOpen(false);
  };

  const handleAddOtro = (): void => {
    const trimmed = otroInput.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setOtroInput('');
    setShowOtro(false);
  };

  const handleRemove = (area: string): void => {
    onChange(value.filter((a) => a !== area));
  };

  const showTrigger = available.length > 0 || !showOtro;

  return (
    <div ref={containerRef} data-testid="areas-select" className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="areas-chips">
          {value.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-pinnacle-navy/10 text-pinnacle-navy text-xs font-semibold"
            >
              {area}
              <button
                type="button"
                aria-label={`Quitar ${area}`}
                className="text-pinnacle-navy/60 hover:text-pinnacle-navy cursor-pointer"
                onClick={(): void => handleRemove(area)}
                data-testid={`remove-area-${area}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {showTrigger && available.length > 0 && (
        <div className="relative">
          <button
            type="button"
            data-testid="areas-dropdown-trigger"
            onClick={(): void => setOpen((o) => !o)}
            className="w-full h-11 flex items-center justify-between px-4 rounded-[4px] bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 text-[13px] font-bold text-[#0f2a44]/50 hover:bg-[#0f2a44]/[0.08] transition-all duration-300"
          >
            <span>+ Agregar área</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div
              data-testid="areas-dropdown"
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#0f2a44]/10 rounded-[4px] shadow-[0_4px_16px_rgba(15,42,68,0.12)] overflow-y-auto max-h-60"
            >
              {available.map((area) => (
                <button
                  key={area}
                  type="button"
                  data-testid={`area-option-${area}`}
                  onClick={(): void => handleSelect(area)}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-[#0f2a44] hover:bg-[#0f2a44]/[0.06] transition-colors duration-150"
                >
                  {area}
                </button>
              ))}
              <button
                type="button"
                data-testid="area-option-otro"
                onClick={(): void => handleSelect(OTRO)}
                className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-[#0f2a44]/60 hover:bg-[#0f2a44]/[0.06] transition-colors duration-150 border-t border-[#0f2a44]/10"
              >
                Otro...
              </button>
            </div>
          )}
        </div>
      )}

      {showOtro && (
        <div className="flex gap-2" data-testid="areas-otro-input-container">
          <input
            type="text"
            data-testid="areas-otro-input"
            placeholder="Nombre del área"
            value={otroInput}
            onChange={(e): void => setOtroInput(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOtro();
              }
            }}
            className="flex-1 archon-input"
            autoFocus
          />
          <button
            type="button"
            data-testid="areas-otro-add-btn"
            onClick={handleAddOtro}
            className="archon-btn-primary px-4"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
};

export default AreasSelect;
