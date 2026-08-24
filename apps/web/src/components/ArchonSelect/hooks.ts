import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type RefObject,
  type Dispatch,
  type SetStateAction,
  type CSSProperties,
} from 'react';
import type { SelectOption } from './types';

/**
 * 🔱 Portal Position Engine — Always opens downward (design consistency).
 * Page scroll handles any viewport overflow. No flip heuristic.
 * FC163 F1B-2, split Alfa 219_AN; movido a archivo hermano por max-lines:400.
 */
export function useDropdownPosition(
  containerRef: RefObject<HTMLDivElement>,
  isOpen: boolean
): { dropdownStyle: CSSProperties; updatePosition: () => void } {
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});

  const updatePosition = useCallback((): void => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [containerRef]);

  useEffect((): (() => void) => {
    if (!isOpen) return (): void => undefined;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return (): void => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  return { dropdownStyle, updatePosition };
}

/** Cierra el combobox al hacer click fuera del contenedor Y del portal (FC163 F1B-2, split Alfa 219_AN). */
export function usePortalClickOutside(
  containerRef: RefObject<HTMLDivElement>,
  onOutside: () => void
): void {
  useEffect((): (() => void) => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      const portalRoot = document.getElementById('archon-select-portal');
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(portalRoot && portalRoot.contains(target))
      ) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, [containerRef, onOutside]);
}

/** Asegura que el nodo raíz del portal exista en el DOM (FC163 F1B-2, split Alfa 219_AN). */
export function usePortalRoot(): HTMLElement | null {
  useEffect((): void => {
    let portalRoot = document.getElementById('archon-select-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'archon-select-portal';
      document.body.appendChild(portalRoot);
    }
  }, []);
  return typeof document !== 'undefined'
    ? document.getElementById('archon-select-portal') ?? document.body
    : null;
}

/** Normaliza, filtra (búsqueda difusa) y resuelve la etiqueta actual de las opciones (FC163 F1B-2, split Alfa 219_AN). */
export function useFilteredSelectOptions(
  options: readonly (string | SelectOption)[] | (string | SelectOption)[],
  searchTerm: string,
  value: string,
  emptyLabel: string
): { filteredOptions: SelectOption[]; currentLabel: string } {
  const normalizedOptions = useMemo(
    () =>
      options.map((opt) => {
        if (typeof opt === 'string') return { value: opt, label: opt };
        return opt;
      }),
    [options]
  );

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

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const currentLabel = value ? selectedOption?.label ?? value : emptyLabel;

  return { filteredOptions, currentLabel };
}

/** Reinicia la búsqueda y enfoca el input al abrir el dropdown (FC163 F1B-2, split Alfa 219_AN). */
export function useResetSearchOnOpen(
  isOpen: boolean,
  searchable: boolean,
  setSearchTerm: (v: string) => void,
  inputRef: RefObject<HTMLInputElement>
): void {
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (searchable) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, searchable, setSearchTerm, inputRef]);
}

/** Handlers de toggle/selección del combobox (FC163 F1B-2, split Alfa 219_AN). */
export function useArchonSelectActions(
  disabled: boolean,
  isOpen: boolean,
  setIsOpen: Dispatch<SetStateAction<boolean>>,
  updatePosition: () => void,
  onChange: (v: string) => void
): { handleToggle: () => void; handleSelect: (v: string) => void } {
  const handleToggle = (): void => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen((prev) => !prev);
  };
  const handleSelect = (v: string): void => {
    onChange(v);
    setIsOpen(false);
  };
  return { handleToggle, handleSelect };
}

export interface UseArchonSelectStateResult {
  isOpen: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  containerRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLInputElement>;
  filteredOptions: SelectOption[];
  currentLabel: string;
  dropdownStyle: CSSProperties;
  portalRoot: HTMLElement | null;
  handleToggle: () => void;
  handleSelect: (v: string) => void;
}

/** Combina filtro + posición + portal + reset + acciones en un único hook (FC163 F1B-2, split Alfa 219_AN). */
export function useArchonSelectState(
  options: readonly (string | SelectOption)[] | (string | SelectOption)[],
  value: string,
  onChange: (v: string) => void,
  emptyLabel: string,
  disabled: boolean,
  searchable: boolean
): UseArchonSelectStateResult {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { filteredOptions, currentLabel } = useFilteredSelectOptions(
    options,
    searchTerm,
    value,
    emptyLabel
  );
  const { dropdownStyle, updatePosition } = useDropdownPosition(containerRef, isOpen);
  usePortalClickOutside(containerRef, (): void => setIsOpen(false));
  const portalRoot = usePortalRoot();
  useResetSearchOnOpen(isOpen, searchable, setSearchTerm, inputRef);
  const { handleToggle, handleSelect } = useArchonSelectActions(
    disabled,
    isOpen,
    setIsOpen,
    updatePosition,
    onChange
  );

  return {
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
  };
}
