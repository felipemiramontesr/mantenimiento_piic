import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import LogsModule from './LogsModule';

describe('LogsModule Forensics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders without crashing', () => {
    const { container } = render(<LogsModule />);
    expect(container).toBeInTheDocument();
  });

  it('sets correct layout title on initial render', async () => {
    render(<LogsModule />);
    await waitFor(() =>
      expect(screen.getByTestId('layout-title')).toHaveTextContent('Logs de Seguridad')
    );
  });

  it('starts on FORENSIC panel (button text is Ver Bitácora)', async () => {
    render(<LogsModule />);
    await waitFor(() => screen.getByTestId('sovereign-layout-header-action'));
    const actionDiv = screen.getByTestId('sovereign-layout-header-action');
    expect(actionDiv.textContent).toContain('Bitácora');
  });

  it('toggles to INCIDENTS panel on header action click', async () => {
    render(<LogsModule />);
    await waitFor(() => screen.getByTestId('sovereign-layout-header-action'));
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    await waitFor(() => {
      const actionDiv = screen.getByTestId('sovereign-layout-header-action');
      expect(actionDiv.textContent).toContain('Incidencias');
    });
  });

  it('toggles back to FORENSIC panel on second click', async () => {
    render(<LogsModule />);
    await waitFor(() => screen.getByTestId('sovereign-layout-header-action'));
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // → INCIDENTS
    fireEvent.click(btn); // → FORENSIC
    await waitFor(() => {
      const actionDiv = screen.getByTestId('sovereign-layout-header-action');
      expect(actionDiv.textContent).toContain('Bitácora');
    });
  });
});
