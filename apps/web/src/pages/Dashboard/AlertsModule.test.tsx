import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import AlertsModule from './AlertsModule';

vi.mock('../../components/Identity/AlertsPanel', () => ({
  default: (): React.ReactElement => <div data-testid="alerts-panel-mock">AlertsPanel</div>,
}));

describe('AlertsModule', () => {
  it('renders without crashing', () => {
    const { container } = render(<AlertsModule />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders AlertsPanel inside the chassis structure', () => {
    render(<AlertsModule />);
    expect(screen.getByTestId('alerts-panel-mock')).toBeDefined();
  });
});
