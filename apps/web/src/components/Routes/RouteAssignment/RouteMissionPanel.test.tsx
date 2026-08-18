import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/testUtils';
import RouteMissionPanel from './RouteMissionPanel';
import { RouteAssignmentFormData } from './types';

/**
 * FC162 F2 — RouteMissionPanel.tsx had zero test coverage. ArchonGeoSelector
 * (its destination sub-tree) already has its own dedicated suite
 * (FC162 F2) — mocked out here to keep this test isolated to
 * RouteMissionPanel's own wiring (origin select + street/número fields).
 */

interface MockGeoSelectorProps {
  originNode?: React.ReactNode;
  onChange: (id: number | undefined, dest: string) => void;
}

vi.mock('./ArchonGeoSelector', () => ({
  default: ({ originNode, onChange }: MockGeoSelectorProps): React.ReactElement => (
    <div>
      {originNode}
      <button onClick={(): void => onChange(100, 'Centro, Fresnillo, Zacatecas')}>
        Mock select colonia
      </button>
    </div>
  ),
}));

const BASE_DATA: RouteAssignmentFormData = {
  unitId: '',
  operatorId: '',
  origin: '',
  destination: '',
  description: '',
  fuelLevel: '',
  arrivalFuelLevel: '',
  startReading: '',
  endReading: '',
  fuelLitersLoaded: '',
  fuelAmount: '',
  fuelTicketImage: '',
  additivesCheck: false,
  tirePressureJson: '',
  checklistJson: '',
};

describe('RouteMissionPanel', () => {
  it('renders the Fase II header and the origin selector inside ArchonGeoSelector.originNode', () => {
    render(
      <RouteMissionPanel
        formData={BASE_DATA}
        updateForm={vi.fn()}
        isEdit={false}
        origins={[{ value: 'MINA', label: 'Mina Norte' }]}
      />
    );
    expect(screen.getByText('Misión y Destino')).toBeInTheDocument();
    expect(screen.getByText('Origen')).toBeInTheDocument();
    expect(screen.getByText('Seleccionar...')).toBeInTheDocument();
  });

  it('selecting an origin calls updateForm with the origin label', () => {
    const updateForm = vi.fn();
    render(
      <RouteMissionPanel
        formData={BASE_DATA}
        updateForm={updateForm}
        isEdit={false}
        origins={[{ value: 'MINA', label: 'Mina Norte' }]}
      />
    );
    fireEvent.click(screen.getByText('Seleccionar...'));
    fireEvent.click(screen.getByText('Mina Norte'));
    expect(updateForm).toHaveBeenCalledWith({ origin: 'Mina Norte' });
  });

  it('selecting a destination colonia updates both destinationNeighborhoodId and destination', () => {
    const updateForm = vi.fn();
    render(
      <RouteMissionPanel formData={BASE_DATA} updateForm={updateForm} isEdit={false} origins={[]} />
    );
    fireEvent.click(screen.getByText('Mock select colonia'));
    expect(updateForm).toHaveBeenCalledWith({
      destinationNeighborhoodId: 100,
      destination: 'Centro, Fresnillo, Zacatecas',
    });
  });

  it('typing calle/número/número interior calls updateForm per field', () => {
    const updateForm = vi.fn();
    render(
      <RouteMissionPanel formData={BASE_DATA} updateForm={updateForm} isEdit={false} origins={[]} />
    );
    fireEvent.change(screen.getByPlaceholderText('Calle o Avenida...'), {
      target: { value: 'Av. Insurgentes' },
    });
    expect(updateForm).toHaveBeenCalledWith({ calle: 'Av. Insurgentes' });

    fireEvent.change(screen.getByPlaceholderText('Ext.'), { target: { value: '123' } });
    expect(updateForm).toHaveBeenCalledWith({ numero: '123' });

    fireEvent.change(screen.getByPlaceholderText('Opcional'), { target: { value: 'B' } });
    expect(updateForm).toHaveBeenCalledWith({ numeroInterior: 'B' });
  });

  it('falls back to an empty string when calle/numero/numeroInterior are undefined', () => {
    render(
      <RouteMissionPanel formData={BASE_DATA} updateForm={vi.fn()} isEdit={false} origins={[]} />
    );
    expect(screen.getByPlaceholderText('Calle o Avenida...')).toHaveValue('');
    expect(screen.getByPlaceholderText('Ext.')).toHaveValue('');
    expect(screen.getByPlaceholderText('Opcional')).toHaveValue('');
  });
});
