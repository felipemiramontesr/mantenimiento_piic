import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import api from '../../api/client';
import ArchonAddressField, { AddressValue, EMPTY_ADDRESS } from './ArchonAddressField';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../ArchonSelect', () => ({
  default: ({
    options,
    value,
    onChange,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (val: string) => void;
  }): React.JSX.Element => (
    <select value={value} onChange={(e): void => onChange(e.target.value)}>
      <option value="">Seleccionar...</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('../ArchonField', () => ({
  default: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }): React.JSX.Element => <div data-label={label}>{children}</div>,
}));

const Wrapper: React.FC<{ initial?: AddressValue }> = ({ initial = EMPTY_ADDRESS }) => {
  const [val, setVal] = useState<AddressValue>(initial);
  return (
    <>
      <ArchonAddressField value={val} onChange={setVal} />
      <span data-testid="current-postal">{val.postalCode}</span>
      <span data-testid="current-state">{val.stateId}</span>
      <span data-testid="current-municipality">{val.municipalityId}</span>
      <span data-testid="current-neighborhood">{val.neighborhoodId}</span>
    </>
  );
};

describe('ArchonAddressField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as Mock).mockResolvedValue({ data: { success: true, data: [] } });
  });

  // ── Scenario 8 — States load on mount ─────────────────────────────────────

  it('loads estados from /geolocation/states on mount — Scenario 8', async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { id: 14, name: 'Jalisco' },
          { id: 9, name: 'CDMX' },
        ],
      },
    });

    render(<Wrapper />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/geolocation/states');
    });

    expect(await screen.findByText('Jalisco')).toBeInTheDocument();
    expect(screen.getByText('CDMX')).toBeInTheDocument();
  });

  it('renders the address field container — Scenario 8', async () => {
    render(<Wrapper />);
    expect(screen.getByTestId('archon-address-field')).toBeInTheDocument();
  });

  it('renders all sub-fields — Scenario 8', async () => {
    render(<Wrapper />);
    expect(screen.getByTestId('address-state-select')).toBeInTheDocument();
    expect(screen.getByTestId('address-municipality-select')).toBeInTheDocument();
    expect(screen.getByTestId('address-neighborhood-select')).toBeInTheDocument();
    expect(screen.getByTestId('address-postal-code')).toBeInTheDocument();
    expect(screen.getByTestId('address-calle')).toBeInTheDocument();
    expect(screen.getByTestId('address-numero-ext')).toBeInTheDocument();
    expect(screen.getByTestId('address-numero-int')).toBeInTheDocument();
  });

  // ── Scenario 9 — Municipalities cascade on state change ───────────────────

  it('loads municipios when estado is selected — Scenario 9', async () => {
    (api.get as Mock)
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 14, name: 'Jalisco' }] },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { id: 120, name: 'Guadalajara' },
            { id: 121, name: 'Zapopan' },
          ],
        },
      });

    render(<Wrapper />);

    await waitFor(() => expect(screen.getByText('Jalisco')).toBeInTheDocument());

    const stateSelect = screen.getByTestId('address-state-select').querySelector('select')!;
    fireEvent.change(stateSelect, { target: { value: '14' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/geolocation/states/14/municipalities');
    });

    expect(await screen.findByText('Guadalajara')).toBeInTheDocument();
    expect(screen.getByText('Zapopan')).toBeInTheDocument();
    expect(screen.getByTestId('current-state').textContent).toBe('14');
  });

  it('clears municipio and colonia when estado changes — Scenario 9', async () => {
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 14, name: 'Jalisco' }] } })
      .mockResolvedValue({ data: { success: true, data: [] } });

    render(<Wrapper />);
    await waitFor(() => expect(screen.getByText('Jalisco')).toBeInTheDocument());

    const stateSelect = screen.getByTestId('address-state-select').querySelector('select')!;
    fireEvent.change(stateSelect, { target: { value: '14' } });

    await waitFor(() => {
      expect(screen.getByTestId('current-municipality').textContent).toBe('');
      expect(screen.getByTestId('current-neighborhood').textContent).toBe('');
    });
  });

  // ── Scenario 10 — CP auto-fill via hydration ───────────────────────────────

  it('auto-fills postalCode when colonia is selected — Scenario 10', async () => {
    (api.get as Mock)
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 14, name: 'Jalisco' }] },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 120, name: 'Guadalajara' }] },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 300, name: 'Chapalita' }] },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 300,
            name: 'Chapalita',
            postalCode: '44500',
            municipalityId: 120,
            stateId: 14,
          },
        },
      });

    render(<Wrapper />);

    await waitFor(() => expect(screen.getByText('Jalisco')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('address-state-select').querySelector('select')!, {
      target: { value: '14' },
    });

    await waitFor(() => expect(screen.getByText('Guadalajara')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('address-municipality-select').querySelector('select')!, {
      target: { value: '120' },
    });

    await waitFor(() => expect(screen.getByText('Chapalita')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('address-neighborhood-select').querySelector('select')!, {
      target: { value: '300' },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/geolocation/neighborhoods/300');
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-postal').textContent).toBe('44500');
    });

    expect(screen.getByTestId('address-postal-code')).toHaveValue('44500');
  });

  it('calle, numeroExt and numeroInt inputs update value — Scenario 10', async () => {
    render(<Wrapper />);

    fireEvent.change(screen.getByTestId('address-calle'), {
      target: { value: 'Av. Reforma' },
    });
    fireEvent.change(screen.getByTestId('address-numero-ext'), {
      target: { value: '42' },
    });
    fireEvent.change(screen.getByTestId('address-numero-int'), {
      target: { value: '3B' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('address-calle')).toHaveValue('Av. Reforma');
      expect(screen.getByTestId('address-numero-ext')).toHaveValue('42');
      expect(screen.getByTestId('address-numero-int')).toHaveValue('3B');
    });
  });
});
