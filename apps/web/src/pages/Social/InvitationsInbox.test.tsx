import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchInvitations, respondInvitation } from './arcsialApi';
import type { Invitation } from './arcsialApi';
import InvitationsInbox from './InvitationsInbox';

/**
 * FC209 F3 — bandeja: pestañas Recibidas/Enviadas, icono y Universo por tipo, vencimiento de las
 * PENDING, estado de las respondidas, acciones por dirección y recarga tras responder.
 */

vi.mock('./arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialApi')>()),
  fetchInvitations: vi.fn(),
  respondInvitation: vi.fn(),
}));

const FUTURE = new Date(Date.now() + 3 * 86_400_000 + 3_600_000).toISOString();

/** Una invitación con valores por defecto. */
function invitation(overrides: Partial<Invitation>): Invitation {
  return {
    id: 1,
    direction: 'RECEIVED',
    inviteType: 'CONTACT',
    status: 'PENDING',
    tenantName: null,
    createdAt: 'x',
    expiresAt: FUTURE,
    counterpartHandle: 'mu_norte',
    counterpartDisplayName: 'Mu Norte',
    ...overrides,
  };
}

const INBOX = [
  invitation({ id: 1 }),
  invitation({ id: 2, inviteType: 'UNIVERSE', tenantName: 'Flota Norte' }),
  invitation({ id: 3, status: 'ACCEPTED' }),
  invitation({ id: 4, direction: 'SENT', counterpartHandle: null, counterpartDisplayName: null }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchInvitations).mockResolvedValue(INBOX);
  vi.mocked(respondInvitation).mockResolvedValue(undefined);
});

describe('InvitationsInbox', () => {
  it('Recibidas: tipo, Universo, vencimiento y estado; Aceptar recarga y avisa', async () => {
    const onChanged = vi.fn();
    render(<InvitationsInbox onChanged={onChanged} />);
    expect(await screen.findByTestId('invitation-2')).toHaveTextContent('Universo: Flota Norte');
    expect(screen.getByTestId('invitation-1')).toHaveTextContent('vence en 3 días');
    expect(screen.getByTestId('invitation-3')).toHaveTextContent('Aceptada');
    expect(screen.queryByTestId('invitation-accept-3')).toBeNull();
    expect(screen.queryByTestId('invitation-4')).toBeNull();
    fireEvent.click(screen.getByTestId('invitation-accept-1'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(respondInvitation).toHaveBeenCalledWith(1, 'accept');
    expect(fetchInvitations).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('invitation-reject-1'));
    await waitFor(() => expect(respondInvitation).toHaveBeenCalledWith(1, 'reject'));
  });

  it('Enviadas: solo Cancelar; sin perfil de la otra parte muestra raya', async () => {
    render(<InvitationsInbox />);
    await screen.findByTestId('invitation-1');
    fireEvent.click(screen.getByText('Enviadas'));
    const sent = screen.getByTestId('invitation-4');
    expect(sent).toHaveTextContent('—');
    expect(screen.queryByTestId('invitation-accept-4')).toBeNull();
    fireEvent.click(screen.getByTestId('invitation-cancel-4'));
    await waitFor(() => expect(respondInvitation).toHaveBeenCalledWith(4, 'cancel'));
    fireEvent.click(screen.getByText('Recibidas'));
    expect(screen.getByTestId('invitation-1')).toBeInTheDocument();
  });

  it('vacía por dirección y errores de carga y de respuesta', async () => {
    vi.mocked(fetchInvitations).mockResolvedValueOnce([invitation({ id: 1 })]);
    vi.mocked(respondInvitation).mockRejectedValue({
      response: { data: { code: 'INVITATION_EXPIRED' } },
    });
    render(<InvitationsInbox />);
    fireEvent.click(await screen.findByTestId('invitation-accept-1'));
    expect(await screen.findByTestId('invitations-error')).toHaveTextContent(
      'La invitación venció'
    );
    fireEvent.click(screen.getByText('Enviadas'));
    expect(screen.getByTestId('invitations-empty')).toHaveTextContent(
      'No hay invitaciones enviadas'
    );
  });

  it('si la bandeja no carga, explica el motivo', async () => {
    vi.mocked(fetchInvitations).mockRejectedValue(new Error('red'));
    render(<InvitationsInbox />);
    expect(await screen.findByTestId('invitations-error')).toHaveTextContent(
      'No se pudo completar'
    );
    expect(screen.getByTestId('invitations-empty')).toHaveTextContent(
      'No hay invitaciones recibidas'
    );
  });
});
