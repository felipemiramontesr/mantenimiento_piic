import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import api from '../../api/client';
import AreasSelect from './AreasSelect';

/**
 * Archon Test: AreasSelect
 * Feature Contract: Archon_Flotilla_AreasCatalog — Fase 3 Web
 * Scenario AR-1: renders container with correct testid
 * Scenario AR-2: loads catalog and renders dropdown trigger
 * Scenario AR-3: opens dropdown with catalog options on trigger click
 * Scenario AR-4: selecting a catalog option calls onChange with label and closes dropdown
 * Scenario AR-5: chips render for selected values
 * Scenario AR-6: clicking × on chip calls onChange with area removed
 * Scenario AR-7: selecting Otro reveals text input
 * Scenario AR-8: typing in Otro input and clicking Agregar adds custom area
 * Scenario AR-9: does not add duplicate areas
 * Scenario AR-10: renders without crash when API fails
 */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

const CATALOG = [
  { code: 'ADMINISTRACION', label: 'Administración' },
  { code: 'FINANZAS', label: 'Finanzas' },
  { code: 'OPERACIONES', label: 'Operaciones' },
];

describe('AreasSelect', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct testid — Scenario AR-1', () => {
    (api.get as Mock).mockReturnValue(
      new Promise(() => {
        /* intentionally pending */
      })
    );
    render(<AreasSelect value={[]} onChange={onChange} />);
    expect(screen.getByTestId('areas-select')).toBeInTheDocument();
  });

  it('renders dropdown trigger after catalog loads — Scenario AR-2', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
  });

  it('opens dropdown with catalog options on trigger click — Scenario AR-3', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('areas-dropdown')).toBeInTheDocument());
    expect(screen.getByTestId('area-option-ADMINISTRACION')).toBeInTheDocument();
    expect(screen.getByTestId('area-option-otro')).toBeInTheDocument();
  });

  it('calls onChange with label and closes dropdown — Scenario AR-4', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-OPERACIONES')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-OPERACIONES'));
    expect(onChange).toHaveBeenCalledWith(['Operaciones']);
    expect(screen.queryByTestId('areas-dropdown')).not.toBeInTheDocument();
  });

  it('renders chips for selected values — Scenario AR-5', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={['Finanzas', 'Operaciones']} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-chips')).toBeInTheDocument());
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    expect(screen.getByText('Operaciones')).toBeInTheDocument();
  });

  it('calls onChange with area removed when × clicked — Scenario AR-6', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={['Finanzas', 'Operaciones']} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('remove-area-Finanzas')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('remove-area-Finanzas'));
    expect(onChange).toHaveBeenCalledWith(['Operaciones']);
  });

  it('reveals text input when Otro is selected — Scenario AR-7', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    expect(screen.getByTestId('areas-otro-input')).toBeInTheDocument();
  });

  it('adds custom area from Otro input — Scenario AR-8', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    fireEvent.change(screen.getByTestId('areas-otro-input'), { target: { value: 'Zona Norte' } });
    fireEvent.click(screen.getByTestId('areas-otro-add-btn'));
    expect(onChange).toHaveBeenCalledWith(['Zona Norte']);
  });

  it('does not add duplicate areas — Scenario AR-9', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<AreasSelect value={['Finanzas']} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-dropdown-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('areas-dropdown-trigger'));
    await waitFor(() => expect(screen.getByTestId('area-option-otro')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('area-option-otro'));
    fireEvent.change(screen.getByTestId('areas-otro-input'), { target: { value: 'Finanzas' } });
    fireEvent.click(screen.getByTestId('areas-otro-add-btn'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders without crash when API fails — Scenario AR-10', async () => {
    (api.get as Mock).mockRejectedValueOnce(new Error('network error'));
    render(<AreasSelect value={[]} onChange={onChange} />);
    await waitFor(() => expect(screen.getByTestId('areas-select')).toBeInTheDocument());
    expect(screen.queryByTestId('areas-dropdown-trigger')).not.toBeInTheDocument();
  });
});
