import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useClickOutside } from './comboboxCore';
import { ComboboxProps, ComboboxOptionItemData } from './types';

const EMPTY_ARRAY: unknown[] = [];

/** Estado de apertura/búsqueda + click-para-abrir del combobox genérico (FC163 F1B-2, split Alfa 219_AN). */
export function useComboboxToggle(
  disabled: boolean,
  inputRef: RefObject<HTMLInputElement>
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

/** Carga/filtra opciones del combobox con debounce (FC163 F1B-2, split Alfa 219_AN). */
export function useComboboxOptions<T>(
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
export function useComboboxSelectedLabel<T>(
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

export interface UseComboboxResult {
  containerRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLInputElement>;
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
export function useCombobox<T>(props: ComboboxProps<T>): UseComboboxResult {
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
