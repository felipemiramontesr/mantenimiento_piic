import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import api from '../../../api/client';
import { archonCache } from '../../../utils/archonCache';

interface StateOption {
  id: number;
  name: string;
}

interface MunicipioOption {
  id: number;
  name: string;
}

interface NeighborhoodOption {
  id: number;
  name: string;
  postalCode: string;
  city?: string;
}

interface ArchonGeoSelectorProps {
  value?: number; // destinationNeighborhoodId
  onChange: (neighborhoodId: number | undefined, destinationString: string) => void;
  disabled?: boolean;
  originNode?: React.ReactNode;
}

interface ComboboxProps<T> {
  value?: number;
  onChange: (id: number, name: string) => void;
  onSearch: (query: string) => Promise<T[]>;
  placeholder?: string;
  disabled?: boolean;
  getOptionLabel: (opt: T) => string;
  getOptionValue: (opt: T) => number;
  getOptionSecondary?: (opt: T) => string | undefined;
  initialOptions?: T[];
}

const EMPTY_ARRAY: unknown[] = [];

/** Cierra el combobox al hacer click fuera de su contenedor (FC163 F1B-2, split Alfa 219_AN). */
function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void): void {
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

/** Carga/filtra opciones del combobox con debounce (FC163 F1B-2, split Alfa 219_AN). */
function useComboboxOptions<T>(
  isOpen: boolean,
  searchTerm: string,
  onSearch: (query: string) => Promise<T[]>,
  initialOptions: T[]
): { options: T[]; loading: boolean } {
  const [options, setOptions] = useState<T[]>(initialOptions);
  const [loading, setLoading] = useState(false);

  useEffect((): void => {
    if (!isOpen) {
      setOptions(initialOptions);
    }
  }, [initialOptions, isOpen]);

  useEffect((): (() => void) | undefined => {
    if (!isOpen) {
      return undefined;
    }
    const delayDebounce = setTimeout(async (): Promise<void> => {
      setLoading(true);
      try {
        const results = await onSearch(searchTerm);
        setOptions(results);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return (): void => clearTimeout(delayDebounce);
  }, [searchTerm, isOpen, onSearch]);

  return { options, loading };
}

/** Resuelve la etiqueta visible para el valor seleccionado (FC163 F1B-2, split Alfa 219_AN). */
function useComboboxSelectedLabel<T>(
  value: number | undefined,
  options: T[],
  initialOptions: T[],
  getOptionValue: (opt: T) => number,
  getOptionLabel: (opt: T) => string
): string {
  const [selectedLabel, setSelectedLabel] = useState('');
  useEffect((): void => {
    if (value) {
      const match =
        options.find((opt) => getOptionValue(opt) === value) ||
        initialOptions.find((opt) => getOptionValue(opt) === value);
      if (match) {
        setSelectedLabel(getOptionLabel(match));
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, options, initialOptions, getOptionValue, getOptionLabel]);
  return selectedLabel;
}

interface ComboboxTriggerProps {
  disabled: boolean;
  isOpen: boolean;
  selectedLabel: string;
  placeholderText: string;
  onClick: () => void;
}

/** Área disparadora del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
function ComboboxTrigger({
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

interface ComboboxOptionItemData {
  key: string;
  id: number;
  label: string;
  secondary?: string;
  isSelected: boolean;
}

interface ComboboxOptionItemProps {
  item: ComboboxOptionItemData;
  onSelect: (id: number, label: string) => void;
}

/** Ítem individual de resultado del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
function ComboboxOptionItem({ item, onSelect }: ComboboxOptionItemProps): React.JSX.Element {
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
function ComboboxDropdownPanel({
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

/** Estado de apertura/búsqueda + click-para-abrir del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
function useComboboxToggle(
  disabled: boolean,
  inputRef: React.RefObject<HTMLInputElement>
): {
  isOpen: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  setIsOpen: (v: boolean) => void;
  handleTriggerClick: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleTriggerClick = (): void => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setTimeout((): void => inputRef.current?.focus(), 100);
    }
  };

  return { isOpen, searchTerm, setSearchTerm, setIsOpen, handleTriggerClick };
}

/** Mapea opciones tipadas a la forma plana que consume ComboboxOptionItem (FC163 F1B-2, split Alfa 219_AN). */
function buildComboboxItems<T>(
  options: T[],
  value: number | undefined,
  getOptionValue: (opt: T) => number,
  getOptionLabel: (opt: T) => string,
  getOptionSecondary?: (opt: T) => string | undefined
): ComboboxOptionItemData[] {
  return options.map((option, idx) => ({
    key: `${getOptionValue(option)}-${idx}`,
    id: getOptionValue(option),
    label: getOptionLabel(option),
    secondary: getOptionSecondary?.(option),
    isSelected: value === getOptionValue(option),
  }));
}

/** Une opciones/loading/selectedLabel/items en una sola llamada (FC163 F1B-2, split Alfa 219_AN). */
function useComboboxData<T>(
  isOpen: boolean,
  searchTerm: string,
  onSearch: (query: string) => Promise<T[]>,
  initialOptions: T[],
  value: number | undefined,
  getOptionValue: (opt: T) => number,
  getOptionLabel: (opt: T) => string,
  getOptionSecondary?: (opt: T) => string | undefined
): { items: ComboboxOptionItemData[]; selectedLabel: string; loading: boolean } {
  const { options, loading } = useComboboxOptions(isOpen, searchTerm, onSearch, initialOptions);
  const selectedLabel = useComboboxSelectedLabel(
    value,
    options,
    initialOptions,
    getOptionValue,
    getOptionLabel
  );
  const items = buildComboboxItems(
    options,
    value,
    getOptionValue,
    getOptionLabel,
    getOptionSecondary
  );
  return { items, selectedLabel, loading };
}

interface UseComboboxResult {
  containerRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  isOpen: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedLabel: string;
  items: ComboboxOptionItemData[];
  loading: boolean;
  handleTriggerClick: () => void;
  handleSelect: (id: number, label: string) => void;
}

/** Combina toggle + datos + click-outside + selección en un único hook (FC163 F1B-2, split Alfa 219_AN). */
function useCombobox<T>(props: ComboboxProps<T>): UseComboboxResult {
  const {
    value,
    onChange,
    onSearch,
    disabled = false,
    getOptionValue,
    getOptionLabel,
    getOptionSecondary,
    initialOptions = EMPTY_ARRAY as T[],
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOpen, searchTerm, setSearchTerm, setIsOpen, handleTriggerClick } = useComboboxToggle(
    disabled,
    inputRef
  );
  const { items, selectedLabel, loading } = useComboboxData(
    isOpen,
    searchTerm,
    onSearch,
    initialOptions,
    value,
    getOptionValue,
    getOptionLabel,
    getOptionSecondary
  );
  useClickOutside(containerRef, (): void => setIsOpen(false));

  const handleSelect = (id: number, label: string): void => {
    onChange(id, label);
    setIsOpen(false);
  };

  return {
    containerRef,
    inputRef,
    isOpen,
    searchTerm,
    setSearchTerm,
    selectedLabel,
    items,
    loading,
    handleTriggerClick,
    handleSelect,
  };
}

function Combobox<T>(props: ComboboxProps<T>): React.JSX.Element {
  const { placeholder: placeholderText = 'Seleccionar...' } = props;
  const cb = useCombobox(props);
  return (
    <div className="relative w-full" ref={cb.containerRef}>
      <ComboboxTrigger
        disabled={props.disabled ?? false}
        isOpen={cb.isOpen}
        selectedLabel={cb.selectedLabel}
        placeholderText={placeholderText}
        onClick={cb.handleTriggerClick}
      />
      {cb.isOpen && (
        <ComboboxDropdownPanel
          searchTerm={cb.searchTerm}
          onSearchChange={cb.setSearchTerm}
          loading={cb.loading}
          inputRef={cb.inputRef}
          items={cb.items}
          onSelect={cb.handleSelect}
        />
      )}
    </div>
  );
}

const getStateLabel = (o: StateOption): string => o.name;
const getStateValue = (o: StateOption): number => o.id;

const getMunicipioLabel = (o: MunicipioOption): string => o.name;
const getMunicipioValue = (o: MunicipioOption): number => o.id;

const getNeighborhoodLabel = (o: NeighborhoodOption): string => o.name;
const getNeighborhoodValue = (o: NeighborhoodOption): number => o.id;
const getNeighborhoodSecondary = (o: NeighborhoodOption): string | undefined =>
  o.postalCode ? `CP: ${o.postalCode}` : undefined;

export default function ArchonGeoSelector({
  value,
  onChange,
  disabled = false,
  originNode,
}: ArchonGeoSelectorProps): React.JSX.Element {
  const [states, setStates] = useState<StateOption[]>([]);
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [selectedMunicipality, setSelectedMunicipality] = useState<number | undefined>(undefined);
  const [loadingHydration, setLoadingHydration] = useState(false);
  const [municipalities, setMunicipalities] = useState<MunicipioOption[]>([]);
  const [hydratedNeighborhood, setHydratedNeighborhood] = useState<NeighborhoodOption | undefined>(
    undefined
  );

  useEffect((): void => {
    const loadStates = async (): Promise<void> => {
      const cached = archonCache.get<StateOption[]>('geo_states');
      if (cached) {
        setStates(cached);
        return;
      }
      try {
        const res = await api.get('/geolocation/states');
        const data = res.data?.data || res.data || [];
        setStates(data);
        archonCache.set('geo_states', data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load states', err);
      }
    };
    loadStates();
  }, []);

  useEffect((): void => {
    if (!selectedState) {
      setMunicipalities([]);
      return;
    }
    const loadMunicipalities = async (): Promise<void> => {
      try {
        const res = await api.get(`/geolocation/states/${selectedState}/municipalities`);
        const data = res.data?.data || res.data || [];
        setMunicipalities(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load municipalities', err);
      }
    };
    loadMunicipalities();
  }, [selectedState]);

  useEffect((): void => {
    if (!value) {
      setSelectedState(undefined);
      setSelectedMunicipality(undefined);
      setHydratedNeighborhood(undefined);
      return;
    }

    const hydrateValue = async (): Promise<void> => {
      setLoadingHydration(true);
      try {
        const res = await api.get(`/geolocation/neighborhoods/${value}`);
        const { data } = res;
        if (data) {
          setSelectedState(data.stateId);
          setSelectedMunicipality(data.municipalityId);
          setHydratedNeighborhood({
            id: data.id,
            name: data.name,
            postalCode: data.postalCode,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to hydrate neighborhood details', err);
      } finally {
        setLoadingHydration(false);
      }
    };

    hydrateValue();
  }, [value]);

  const handleStateChange = useCallback(
    (stateId: number): void => {
      setSelectedState(stateId);
      setSelectedMunicipality(undefined);
      onChange(undefined, '');
    },
    [onChange]
  );

  const handleMunicipioChange = useCallback(
    (municipalityId: number): void => {
      setSelectedMunicipality(municipalityId);
      onChange(undefined, '');
    },
    [onChange]
  );

  const handleNeighborhoodChange = useCallback(
    async (neighborhoodId: number, neighborhoodName: string): Promise<void> => {
      try {
        const stateObj = states.find((s) => s.id === selectedState);
        const resMun = await api.get(`/geolocation/states/${selectedState}/municipalities`);
        const { data } = resMun;
        const munList = data?.data || data || [];
        const munObj = munList.find((m: MunicipioOption) => m.id === selectedMunicipality);

        const destinationString = `${neighborhoodName}, ${munObj?.name || ''}, ${
          stateObj?.name || ''
        }`;
        onChange(neighborhoodId, destinationString);
      } catch {
        onChange(neighborhoodId, neighborhoodName);
      }
    },
    [selectedState, selectedMunicipality, states, onChange]
  );

  const searchStates = useCallback(
    async (search: string): Promise<StateOption[]> => {
      const term = search.toLowerCase().trim();
      if (!term) {
        return states;
      }
      return states.filter((s) => s.name.toLowerCase().includes(term));
    },
    [states]
  );

  const searchMunicipalities = useCallback(
    async (search: string): Promise<MunicipioOption[]> => {
      if (!selectedState) {
        return [];
      }
      try {
        const res = await api.get(`/geolocation/states/${selectedState}/municipalities`, {
          params: { search },
        });
        const { data } = res;
        return data?.data || data || [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return [];
      }
    },
    [selectedState]
  );

  const searchNeighborhoods = useCallback(
    async (search: string): Promise<NeighborhoodOption[]> => {
      if (!selectedMunicipality) {
        return [];
      }
      try {
        const res = await api.get(
          `/geolocation/municipalities/${selectedMunicipality}/neighborhoods`,
          {
            params: { search },
          }
        );
        const { data } = res;
        return data?.data || data || [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return [];
      }
    },
    [selectedMunicipality]
  );

  if (originNode) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">{originNode}</div>

        <div className="space-y-2">
          <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            Destino
          </label>
          <Combobox<StateOption>
            value={selectedState}
            onChange={handleStateChange}
            onSearch={searchStates}
            initialOptions={states}
            disabled={disabled || loadingHydration}
            placeholder="Buscar Estado..."
            getOptionLabel={getStateLabel}
            getOptionValue={getStateValue}
          />
        </div>

        <div className="space-y-2">
          <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            Municipio
          </label>
          <Combobox<MunicipioOption>
            value={selectedMunicipality}
            onChange={handleMunicipioChange}
            onSearch={searchMunicipalities}
            initialOptions={municipalities}
            disabled={disabled || !selectedState || loadingHydration}
            placeholder="Buscar Municipio..."
            getOptionLabel={getMunicipioLabel}
            getOptionValue={getMunicipioValue}
          />
        </div>

        <div className="space-y-2">
          <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            Colonia / Código Postal
          </label>
          <Combobox<NeighborhoodOption>
            value={value}
            onChange={handleNeighborhoodChange}
            onSearch={searchNeighborhoods}
            initialOptions={hydratedNeighborhood ? [hydratedNeighborhood] : undefined}
            disabled={disabled || !selectedMunicipality || loadingHydration}
            placeholder="Buscar Colonia..."
            getOptionLabel={getNeighborhoodLabel}
            getOptionValue={getNeighborhoodValue}
            getOptionSecondary={getNeighborhoodSecondary}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Estado
        </label>
        <Combobox<StateOption>
          value={selectedState}
          onChange={handleStateChange}
          onSearch={searchStates}
          initialOptions={states}
          disabled={disabled || loadingHydration}
          placeholder="Buscar Estado..."
          getOptionLabel={getStateLabel}
          getOptionValue={getStateValue}
        />
      </div>

      <div className="space-y-2">
        <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Municipio
        </label>
        <Combobox<MunicipioOption>
          value={selectedMunicipality}
          onChange={handleMunicipioChange}
          onSearch={searchMunicipalities}
          initialOptions={municipalities}
          disabled={disabled || !selectedState || loadingHydration}
          placeholder="Buscar Municipio..."
          getOptionLabel={getMunicipioLabel}
          getOptionValue={getMunicipioValue}
        />
      </div>

      <div className="space-y-2">
        <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Colonia / Código Postal
        </label>
        <Combobox<NeighborhoodOption>
          value={value}
          onChange={handleNeighborhoodChange}
          onSearch={searchNeighborhoods}
          initialOptions={hydratedNeighborhood ? [hydratedNeighborhood] : undefined}
          disabled={disabled || !selectedMunicipality || loadingHydration}
          placeholder="Buscar Colonia..."
          getOptionLabel={getNeighborhoodLabel}
          getOptionValue={getNeighborhoodValue}
          getOptionSecondary={getNeighborhoodSecondary}
        />
      </div>
    </div>
  );
}
