import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import SettingsModule from './SettingsModule';

vi.mock('../../components/Identity/ArchonProfilePanel', () => ({
  default: (): React.JSX.Element => <div data-testid="identity-panel">Identity Panel</div>,
}));

const renderModule = (): void => {
  render(<SettingsModule />);
};

describe('SettingsModule', () => {
  it('renders ArchonProfilePanel', (): void => {
    renderModule();
    expect(screen.getByTestId('identity-panel')).toBeInTheDocument();
  });

  it('does not render alerts panel', (): void => {
    renderModule();
    expect(screen.queryByTestId('alerts-panel')).not.toBeInTheDocument();
  });

  it('sets layout title to Configuración de Identidad', (): void => {
    renderModule();
    expect(screen.getByTestId('layout-title')).toHaveTextContent('Configuración de Identidad');
  });
});
