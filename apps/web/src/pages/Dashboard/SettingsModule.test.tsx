import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import SettingsModule from './SettingsModule';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: mockUseAuth };
});

vi.mock('../../components/Identity/ArchonProfilePanel', () => ({
  default: (): React.JSX.Element => <div data-testid="identity-panel">Identity Panel</div>,
}));

vi.mock('../../components/Identity/OwnerProfilePanel', () => ({
  default: (): React.JSX.Element => <div data-testid="owner-profile-panel-mock">Owner Profile</div>,
}));

const renderModule = (): void => {
  render(<SettingsModule />);
};

describe('SettingsModule', () => {
  it('renders ArchonProfilePanel', (): void => {
    mockUseAuth.mockReturnValue({ currentUser: null, ownerType: null });
    renderModule();
    expect(screen.getByTestId('identity-panel')).toBeInTheDocument();
  });

  it('does not render alerts panel', (): void => {
    mockUseAuth.mockReturnValue({ currentUser: null, ownerType: null });
    renderModule();
    expect(screen.queryByTestId('alerts-panel')).not.toBeInTheDocument();
  });

  it('sets layout title to Configuración de Identidad', (): void => {
    mockUseAuth.mockReturnValue({ currentUser: null, ownerType: null });
    renderModule();
    expect(screen.getByTestId('layout-title')).toHaveTextContent('Configuración de Identidad');
  });

  it('shows OwnerProfilePanel when ownerType is not null', (): void => {
    mockUseAuth.mockReturnValue({ currentUser: { ownerType: 'FLOTILLA' }, ownerType: 'FLOTILLA' });
    renderModule();
    expect(screen.getByTestId('owner-profile-panel-mock')).toBeInTheDocument();
  });

  it('hides OwnerProfilePanel when ownerType is null', (): void => {
    mockUseAuth.mockReturnValue({ currentUser: null, ownerType: null });
    renderModule();
    expect(screen.queryByTestId('owner-profile-panel-mock')).not.toBeInTheDocument();
  });
});
