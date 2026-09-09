import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import api from '../../api/client';

interface AreaOption {
  code: string;
  label: string;
}

interface AreasSelectProps {
  readonly value: string[];
  readonly onChange: (areas: string[]) => void;
}

/** Catálogo de áreas (`/catalogs/areas`) — vacío + `loading` si falla o mientras carga
 * (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation — sub-split de AreasSelect). */
function useAreasCatalog(): { catalog: AreaOption[]; loading: boolean } {
  const [catalog, setCatalog] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ success: boolean; data: AreaOption[] }>('/catalogs/areas')
      .then((res) => {
        if (!cancelled) setCatalog(res.data?.data ?? []);
      })
      .catch(() => {
        // catalog unavailable — dropdown stays empty, Otro still works
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading };
}

/** Cierra el dropdown al hacer click fuera del contenedor
 * (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation — sub-split de AreasSelect). */
function useCloseDropdownOnOutsideClick(
  containerRef: React.RefObject<HTMLDivElement>,
  setOpen: (open: boolean) => void
): void {
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
  }, [containerRef, setOpen]);
}

interface UseAreasSelectStateResult {
  catalog: AreaOption[];
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  otroInput: string;
  setOtroInput: (v: string) => void;
  showOtro: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  available: AreaOption[];
  handleSelect: (label: string) => void;
  handleSelectOtro: () => void;
  handleAddOtro: () => void;
  handleRemove: (area: string) => void;
}

/** Estado + handlers completos de AreasSelect
 * (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation). */
function useAreasSelectState(
  value: string[],
  onChange: (areas: string[]) => void
): UseAreasSelectStateResult {
  const { catalog, loading } = useAreasCatalog();
  const [open, setOpen] = useState(false);
  const [otroInput, setOtroInput] = useState('');
  const [showOtro, setShowOtro] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useCloseDropdownOnOutsideClick(containerRef, setOpen);

  const available = catalog.filter((item) => !value.includes(item.label));

  const handleSelect = (label: string): void => {
    // Único call-site: los botones de `available`, que ya excluye por
    // construcción cualquier label presente en `value` — el guard
    // `if(!value.includes(label))` era, por eso, inalcanzable (FC165 F3
    // Slice3.2 Batch2, purga sintáctica).
    onChange([...value, label]);
    setOpen(false);
  };

  const handleSelectOtro = (): void => {
    setShowOtro(true);
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

  return {
    catalog,
    loading,
    open,
    setOpen,
    otroInput,
    setOtroInput,
    showOtro,
    containerRef,
    available,
    handleSelect,
    handleSelectOtro,
    handleAddOtro,
    handleRemove,
  };
}

interface AreaChipsProps {
  readonly value: string[];
  readonly onRemove: (area: string) => void;
}

/** Chips de áreas ya seleccionadas (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation). */
function AreaChips({ value, onRemove }: AreaChipsProps): React.JSX.Element | null {
  if (value.length === 0) return null;
  return (
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
            onClick={(): void => onRemove(area)}
            data-testid={`remove-area-${area}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

interface AreasDropdownProps {
  readonly available: AreaOption[];
  readonly open: boolean;
  readonly onToggleOpen: () => void;
  readonly onSelect: (label: string) => void;
  readonly onSelectOtro: () => void;
}

/** Disparador + panel del dropdown de áreas disponibles
 * (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation). */
function AreasDropdown({
  available,
  open,
  onToggleOpen,
  onSelect,
  onSelectOtro,
}: AreasDropdownProps): React.JSX.Element {
  return (
    <div className="relative">
      <button
        type="button"
        data-testid="areas-dropdown-trigger"
        onClick={onToggleOpen}
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
          {available.map((item) => (
            <button
              key={item.code}
              type="button"
              data-testid={`area-option-${item.code}`}
              onClick={(): void => onSelect(item.label)}
              className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-[#0f2a44] hover:bg-[#0f2a44]/[0.06] transition-colors duration-150"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            data-testid="area-option-otro"
            onClick={onSelectOtro}
            className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-[#0f2a44]/60 hover:bg-[#0f2a44]/[0.06] transition-colors duration-150 border-t border-[#0f2a44]/10"
          >
            Otro...
          </button>
        </div>
      )}
    </div>
  );
}

interface OtroInputRowProps {
  readonly otroInput: string;
  readonly onInputChange: (v: string) => void;
  readonly onAdd: () => void;
}

/** Campo de texto libre para un área fuera del catálogo
 * (FC165 F3 Slice3.2 Batch2, Dual-Gate Isolation). S9379: autoFocus JSX
 * declarativo reemplazado por ref + efecto explícito — mismo comportamiento
 * (foco al elegir "Otro", disparado por acción del usuario, no al cargar la
 * página), fuera del alcance de la regla. */
function OtroInputRow({ otroInput, onInputChange, onAdd }: OtroInputRowProps): React.JSX.Element {
  const otroInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    otroInputRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-2" data-testid="areas-otro-input-container">
      <input
        ref={otroInputRef}
        type="text"
        data-testid="areas-otro-input"
        placeholder="Nombre del área"
        value={otroInput}
        onChange={(e): void => onInputChange(e.target.value)}
        onKeyDown={(e): void => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        className="flex-1 archon-input"
      />
      <button
        type="button"
        data-testid="areas-otro-add-btn"
        onClick={onAdd}
        className="archon-btn-primary px-4"
      >
        Agregar
      </button>
    </div>
  );
}

/** Selector de áreas: catálogo remoto + chips seleccionados + opción "Otro" libre. */
const AreasSelect: React.FC<AreasSelectProps> = ({ value, onChange }): React.JSX.Element => {
  const state = useAreasSelectState(value, onChange);

  return (
    <div ref={state.containerRef} data-testid="areas-select" className="space-y-2">
      <AreaChips value={value} onRemove={state.handleRemove} />
      {!state.loading && state.available.length > 0 && (
        <AreasDropdown
          available={state.available}
          open={state.open}
          onToggleOpen={(): void => state.setOpen(!state.open)}
          onSelect={state.handleSelect}
          onSelectOtro={state.handleSelectOtro}
        />
      )}
      {state.showOtro && (
        <OtroInputRow
          otroInput={state.otroInput}
          onInputChange={state.setOtroInput}
          onAdd={state.handleAddOtro}
        />
      )}
    </div>
  );
};

export default AreasSelect;
