import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import SettingsModule from './SettingsModule';

vi.mock('../../components/Identity/AlertsPanel', () => ({
  default: (): React.JSX.Element => <div data-testid="alerts-panel">Alertas Panel</div>,
}));
vi.mock('../../components/Identity/ArchonProfilePanel', () => ({
  default: (): React.JSX.Element => <div data-testid="identity-panel">Identity Panel</div>,
}));

const renderModule = (): void => {
  render(<SettingsModule />);
};

describe('SettingsModule (Alertas + Identidad)', () => {
  it('renders ALERTS panel by default', (): void => {
    renderModule();
    expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('identity-panel')).not.toBeInTheDocument();
  });

  it('header card shows Configuración de Identidad button on ALERTS panel', (): void => {
    renderModule();
    expect(screen.getByTestId('sovereign-layout-header-action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /configuración de identidad/i })).toBeInTheDocument();
  });

  it('switches to IDENTITY panel when header card is clicked', async (): Promise<void> => {
    renderModule();
    const btn = screen.getByRole('button', { name: /configuración de identidad/i });
    fireEvent.click(btn);
    await waitFor((): void => {
      expect(screen.getByTestId('identity-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('alerts-panel')).not.toBeInTheDocument();
    });
  });

  it('header card shows Ver Alertas button on IDENTITY panel', async (): Promise<void> => {
    renderModule();
    fireEvent.click(screen.getByRole('button', { name: /configuración de identidad/i }));
    await waitFor((): void => {
      expect(screen.getByRole('button', { name: /ver alertas/i })).toBeInTheDocument();
    });
  });

  it('switches back to ALERTS panel when Ver Alertas is clicked', async (): Promise<void> => {
    renderModule();
    fireEvent.click(screen.getByRole('button', { name: /configuración de identidad/i }));
    await waitFor((): void => {
      expect(screen.getByTestId('identity-panel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /ver alertas/i }));
    await waitFor((): void => {
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('identity-panel')).not.toBeInTheDocument();
    });
  });

  it('sets correct layout title for ALERTS panel', (): void => {
    renderModule();
    expect(screen.getByTestId('layout-title')).toHaveTextContent('Alertas y Notificaciones');
  });
});
