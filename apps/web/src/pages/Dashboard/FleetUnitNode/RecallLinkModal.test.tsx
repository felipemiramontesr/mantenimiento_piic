import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/testUtils';
import { RecallLinkModal } from './RecallLinkModal';

/**
 * R4-C Fc162 — RecallLinkModal.tsx had no dedicated test file; handleSubmit
 * and the recall-id input's onChange sat entirely uncovered.
 */
describe('RecallLinkModal', () => {
  it('submits the parsed recall id, then resets the field and closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<RecallLinkModal isOpen onClose={onClose} onConfirm={onConfirm} />);

    const input = screen.getByLabelText('ID del recall');
    fireEvent.change(input, { target: { value: '42' } });
    expect(input).toHaveValue(42);

    fireEvent.click(screen.getByText('Vincular'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(42));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <RecallLinkModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
