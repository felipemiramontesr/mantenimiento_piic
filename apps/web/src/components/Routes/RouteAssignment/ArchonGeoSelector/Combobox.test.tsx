/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Combobox } from './Combobox';

interface Option {
  id: number;
  name: string;
}

describe('Combobox — disabled prop omitted (FC165 F3 Slice3.2 Batch1)', () => {
  it('defaults to enabled when the caller never passes `disabled`', () => {
    // Todos los call-sites reales (ArchonGeoSelector/GeoFieldsGroup) siempre
    // reenvían un booleano explícito — esta prueba ejercita el otro lado de
    // `props.disabled ?? false`, la ruta de un consumidor directo de este
    // componente genérico que omite la prop por completo.
    render(
      <Combobox<Option>
        onChange={vi.fn()}
        onSearch={vi.fn().mockResolvedValue([])}
        placeholder="Seleccionar..."
        getOptionLabel={(o): string => o.name}
        getOptionValue={(o): number => o.id}
      />
    );

    const trigger = screen.getByRole('button');
    // FC166 Track D (S6819) — the trigger is now a native <button>, whose
    // own `disabled` attribute (not a manual tabIndex) is the real signal.
    expect(trigger).toBeEnabled();
    expect(trigger.className).not.toContain('cursor-not-allowed');
  });
});
