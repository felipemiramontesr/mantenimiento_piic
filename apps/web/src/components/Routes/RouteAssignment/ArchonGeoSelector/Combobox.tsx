import React from 'react';
import { ComboboxTrigger, ComboboxDropdownPanel } from './comboboxCore';
import { useCombobox } from './comboboxHooks';
import { ComboboxProps } from './types';

/** Combobox genérico con búsqueda remota, usado por selectores de estado/municipio/colonia (FC163 F1B-2, split Alfa 219_AN). */
export function Combobox<T>(props: ComboboxProps<T>): React.JSX.Element {
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

export default Combobox;
