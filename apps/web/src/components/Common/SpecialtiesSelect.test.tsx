import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import api from '../../api/client';
import SpecialtiesSelect from './SpecialtiesSelect';

/**
 * Archon Test: SpecialtiesSelect
 * Feature Contract: Archon_VIM_SpecialtiesUX v2 — Fase 2 Web
 * Scenario SS-1: renders chip-select container (testid present)
 * Scenario SS-2: loads catalog and renders dropdown trigger
 * Scenario SS-3: selected chips render from value prop
 * Scenario SS-4: clicking an option calls onChange with new code appended
 * Scenario SS-5: clicking × on chip calls onChange with code removed
 * Scenario SS-6: handles API error gracefully (no crash)
 */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

const CATALOG = [
  { code: 'MOTOR', label: 'Motor' },
  { code: 'FRENOS', label: 'Frenos' },
  { code: 'PINTURA', label: 'Pintura' },
];

describe('SpecialtiesSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct testid — Scenario SS-1', () => {
    (api.get as Mock).mockReturnValue(
      new Promise<void>((_resolve) => {
        /* intentionally pending */
      })
    );
    render(<SpecialtiesSelect value={[]} onChange={vi.fn()} />);
    expect(screen.getByTestId('owner-especialidades-input')).toBeInTheDocument();
  });

  it('renders dropdown trigger after catalog loads — Scenario SS-2', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<SpecialtiesSelect value={[]} onChange={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('specialties-dropdown-trigger')).toBeInTheDocument()
    );
  });

  it('renders chips for selected values — Scenario SS-3', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    render(<SpecialtiesSelect value={['MOTOR', 'FRENOS']} onChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('specialties-chips')).toBeInTheDocument());
    expect(screen.getByText('Motor')).toBeInTheDocument();
    expect(screen.getByText('Frenos')).toBeInTheDocument();
  });

  it('calls onChange with new code when option clicked — Scenario SS-4', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    const onChange = vi.fn();
    render(<SpecialtiesSelect value={['MOTOR']} onChange={onChange} />);

    await waitFor(() =>
      expect(screen.getByTestId('specialties-dropdown-trigger')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('specialties-dropdown-trigger'));

    await waitFor(() => expect(screen.getByTestId('specialty-option-FRENOS')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('specialty-option-FRENOS'));

    expect(onChange).toHaveBeenCalledWith(['MOTOR', 'FRENOS']);
  });

  it('calls onChange with code removed when × clicked — Scenario SS-5', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: CATALOG } });
    const onChange = vi.fn();
    render(<SpecialtiesSelect value={['MOTOR', 'FRENOS']} onChange={onChange} />);

    await waitFor(() => expect(screen.getByTestId('remove-specialty-MOTOR')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('remove-specialty-MOTOR'));

    expect(onChange).toHaveBeenCalledWith(['FRENOS']);
  });

  it('renders without crash when API fails — Scenario SS-6', async () => {
    (api.get as Mock).mockRejectedValueOnce(new Error('network error'));
    render(<SpecialtiesSelect value={[]} onChange={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('owner-especialidades-input')).toBeInTheDocument()
    );
  });
});
