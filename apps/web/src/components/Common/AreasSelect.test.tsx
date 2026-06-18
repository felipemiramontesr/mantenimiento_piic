import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import AreasSelect from './AreasSelect';

/**
 * Archon Test: AreasSelect
 * Feature Contract: Archon_Flotilla_AreasSelect — Fase 1 Web
 * Scenario AR-1: renders container with correct testid
 * Scenario AR-2: renders dropdown trigger
 * Scenario AR-3: opens dropdown with catalog options on trigger click
 * Scenario AR-4: selecting a catalog option calls onChange and closes dropdown
 * Scenario AR-5: chips render for selected values
 * Scenario AR-6: clicking × on chip calls onChange with area removed
 * Scenario AR-7: selecting Otro reveals text input
 * Scenario AR-8: typing in Otro input and clicking Agregar adds custom area
 * Scenario AR-9: does not add duplicate areas
 */

describe('AreasSelect', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct testid — Scenario AR-1', () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    expect(screen.getByTestId('areas-select')).toBeInTheDocument();
  });

  it('renders dropdown trigger — Scenario AR-2', () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument();
  });

  it('opens dropdown with catalog options on trigger click — Scenario AR-3', async () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('areas-dropdown')).toBeInTheDocument());
    expect(screen.getByTestId('area-option-Administración')).toBeInTheDocument();
    expect(screen.getByTestId('area-option-otro')).toBeInTheDocument();
  });

  it('calls onChange with selected area and closes dropdown — Scenario AR-4', async () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-Operaciones')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-Operaciones'));
    expect(onChange).toHaveBeenCalledWith(['Operaciones']);
    expect(screen.queryByTestId('areas-dropdown')).not.toBeInTheDocument();
  });

  it('renders chips for selected values — Scenario AR-5', () => {
    render(<AreasSelect value={['Finanzas', 'Operaciones']} onChange={onChange} />);
    expect(screen.getByTestId('areas-chips')).toBeInTheDocument();
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    expect(screen.getByText('Operaciones')).toBeInTheDocument();
  });

  it('calls onChange with area removed when × clicked — Scenario AR-6', () => {
    render(<AreasSelect value={['Finanzas', 'Operaciones']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('remove-area-Finanzas'));
    expect(onChange).toHaveBeenCalledWith(['Operaciones']);
  });

  it('reveals text input when Otro is selected — Scenario AR-7', async () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    expect(screen.getByTestId('areas-otro-input')).toBeInTheDocument();
  });

  it('adds custom area from Otro input — Scenario AR-8', async () => {
    render(<AreasSelect value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    fireEvent.change(screen.getByTestId('areas-otro-input'), {
      target: { value: 'Zona Norte' },
    });
    fireEvent.click(screen.getByTestId('areas-otro-add-btn'));
    expect(onChange).toHaveBeenCalledWith(['Zona Norte']);
  });

  it('does not add duplicate areas — Scenario AR-9', async () => {
    render(<AreasSelect value={['Finanzas']} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    fireEvent.change(screen.getByTestId('areas-otro-input'), {
      target: { value: 'Finanzas' },
    });
    fireEvent.click(screen.getByTestId('areas-otro-add-btn'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
