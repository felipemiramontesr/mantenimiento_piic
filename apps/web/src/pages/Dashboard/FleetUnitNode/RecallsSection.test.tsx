import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecallsSection } from './RecallsSection';
import { useFleetRecalls } from '../../../hooks/useFleetRecalls';
import type { RecallItem } from '../../../hooks/useFleetRecalls';

/**
 * R4-C Fc162 — RecallsSection.tsx had no dedicated test file. The
 * complete/not-applicable row actions and the Link Recall modal's
 * close handler sat uncovered.
 */

vi.mock('../../../hooks/useFleetRecalls');

const recall: RecallItem = {
  recall_id: 5,
  campaign_code: 'C-001',
  description: 'Falla de frenos',
  make: 'Nissan',
  model: 'March',
  year: 2020,
  published_date: '2026-01-01',
  status: 'PENDING',
  resolved_at: null,
  work_order_id: null,
};

const makeHook = (): {
  recalls: RecallItem[];
  loading: boolean;
  error: null;
  refresh: ReturnType<typeof vi.fn>;
  linkRecall: ReturnType<typeof vi.fn>;
  updateStatus: ReturnType<typeof vi.fn>;
} => ({
  recalls: [recall],
  loading: false,
  error: null,
  refresh: vi.fn(),
  linkRecall: vi.fn(async () => undefined),
  updateStatus: vi.fn(async () => undefined),
});

const renderSection = (): ReturnType<typeof render> =>
  render(<RecallsSection unitId="ASM-001" make="Nissan" model="March" year={2020} />);

describe('RecallsSection', () => {
  it('clicking "Marcar como completado" calls updateStatus with COMPLETED', () => {
    const hook = makeHook();
    vi.mocked(useFleetRecalls).mockReturnValue(hook);
    renderSection();
    fireEvent.click(screen.getByTitle('Marcar como completado'));
    expect(hook.updateStatus).toHaveBeenCalledWith(5, 'COMPLETED');
  });

  it('clicking "Marcar como no aplica" calls updateStatus with NOT_APPLICABLE', () => {
    const hook = makeHook();
    vi.mocked(useFleetRecalls).mockReturnValue(hook);
    renderSection();
    fireEvent.click(screen.getByTitle('Marcar como no aplica'));
    expect(hook.updateStatus).toHaveBeenCalledWith(5, 'NOT_APPLICABLE');
  });

  it('opens the Link Recall modal and closes it via Cancelar', () => {
    const hook = makeHook();
    vi.mocked(useFleetRecalls).mockReturnValue(hook);
    renderSection();
    fireEvent.click(screen.getByTitle('Vincular recall del catálogo'));
    expect(screen.getByLabelText('ID del recall')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByLabelText('ID del recall')).not.toBeInTheDocument();
  });
});
