import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import LogsModule from './LogsModule';

describe('LogsModule Forensics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('executes scrollIntoView inside the 100ms setTimeout after panel toggle', async () => {
    render(<LogsModule />);
    // Wait with real timers until the button is in the DOM
    await screen.findByTestId('sovereign-layout-header-action');
    const btn = screen.getByRole('button');

    // Switch to fake timers AFTER async DOM is ready
    vi.useFakeTimers();
    fireEvent.click(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
