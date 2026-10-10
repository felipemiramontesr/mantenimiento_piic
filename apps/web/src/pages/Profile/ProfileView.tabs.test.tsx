import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import api from '../../api/client';
import ProfileView from './ProfileView';

/**
 * FC209 F3 — Arcsial en pestañas sobre la misma ruta (`/dashboard/social`, la única del Arc itinerante):
 * Muro por defecto, Contactos e Invitaciones. Las dos pestañas nuevas tienen sus propias pruebas.
 */

vi.mock('../../api/client');
vi.mock('../Social/ProfileContactsTab', () => ({
  default: (): React.JSX.Element => <div data-testid="stub-contacts-tab" />,
}));
vi.mock('../Social/InvitationsInbox', () => ({
  default: (): React.JSX.Element => <div data-testid="stub-invitations-inbox" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ data: { posts: [] } });
});

describe('ProfileView — pestañas de Arcsial', () => {
  it('abre en el Muro y cambia a Contactos e Invitaciones', async () => {
    render(<ProfileView />);
    expect(screen.getByTestId('arcsial-tab-wall')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Muro Social')).toBeInTheDocument();
    expect(screen.getByTestId('layout-title')).toHaveTextContent('Arcsial');

    fireEvent.click(screen.getByTestId('arcsial-tab-contacts'));
    expect(screen.getByTestId('stub-contacts-tab')).toBeInTheDocument();
    expect(screen.queryByText('Muro Social')).toBeNull();
    expect(screen.getByTestId('arcsial-tab-contacts')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByTestId('arcsial-tab-invitations'));
    expect(screen.getByTestId('stub-invitations-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-contacts-tab')).toBeNull();

    fireEvent.click(screen.getByTestId('arcsial-tab-wall'));
    expect(await screen.findByText('Muro Social')).toBeInTheDocument();
  });
});
