import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/testUtils';
import ArchonFeedbackBanner from './ArchonFeedbackBanner';

describe('ArchonFeedbackBanner Component', () => {
  const mockClear = vi.fn();

  it('renders null when message is empty', (): void => {
    const { container } = render(<ArchonFeedbackBanner message="" onClear={mockClear} />);
    expect(container.querySelector('[data-testid="archon-feedback-banner"]')).toBeNull();
  });

  it('renders error banner by default', (): void => {
    render(<ArchonFeedbackBanner message="Error occurred" onClear={mockClear} />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(screen.getByText('Notificación del Sistema')).toBeInTheDocument();
  });

  it('renders success banner', (): void => {
    render(<ArchonFeedbackBanner message="All good" type="success" onClear={mockClear} />);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders info banner', (): void => {
    render(<ArchonFeedbackBanner message="Information" type="info" onClear={mockClear} />);
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('calls onClear when close button is clicked', (): void => {
    render(<ArchonFeedbackBanner message="Close me" onClear={mockClear} />);
    fireEvent.click(screen.getByLabelText('Cerrar notificación'));
    expect(mockClear).toHaveBeenCalled();
  });
});
