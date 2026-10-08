import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../../test/testUtils';
import api from '../../../../api/client';
import PlatformUsersCard from './PlatformUsersCard';
import type { PlatformUser } from './platformUsersApi';
import type { UniverseRow } from '../CosmologyForms';

/**
 * FC206 F1 — «Vincular a Universo» en la consola de Ω (Escenarios 1–4): solo para itinerantes, rol ARC
 * por defecto y MU solo donde el Universo no tiene MU, botón activo solo con el nombre exacto.
 */

vi.mock('../../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const UNIVERSES = [
  {
    id: 41,
    label: 'Flota Norte',
    universeTypeCode: 'FMS',
    activeSuperclusters: 5,
    activeClusters: 1,
    hasMu: true,
  },
  {
    id: 42,
    label: 'Flota Sur',
    universeTypeCode: 'FMS',
    activeSuperclusters: 5,
    activeClusters: 1,
    hasMu: false,
  },
] as UniverseRow[];

const NOMAD: PlatformUser = {
  id: 21,
  username: 'nomad',
  fullName: 'Arc Nómada',
  email: 'nomad@piic.mx',
  isActive: true,
  roleId: 2,
  tenantId: null,
  tenantName: null,
  cosmonautType: null,
};
const MEMBER: PlatformUser = {
  ...NOMAD,
  id: 20,
  username: 'arc',
  tenantId: 41,
  tenantName: 'Flota Norte',
};

function givenUsers(users: PlatformUser[]): void {
  vi.mocked(api.get).mockImplementation(async (url: string) =>
    url === '/cosmology/users'
      ? { data: { success: true, data: users, total: users.length } }
      : { data: {} }
  );
}

function usersFetches(): number {
  return vi.mocked(api.get).mock.calls.filter(([url]) => url === '/cosmology/users').length;
}

/** Abre la ventana para el itinerante y elige el Universo. */
async function openAndPick(universeLabel: string): Promise<void> {
  fireEvent.click(await screen.findByTestId('platform-user-link-21-itinerant'));
  fireEvent.click(screen.getByText('Selecciona un Universo'));
  fireEvent.click(screen.getByText(universeLabel));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue({ data: { success: true, role: 'ARC' } });
});

describe('FC206 F1 — Vincular a Universo', () => {
  it('solo el itinerante ofrece «Vincular a Universo»', async () => {
    givenUsers([MEMBER, NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    expect(await screen.findByTestId('platform-user-link-21-itinerant')).toBeInTheDocument();
    expect(screen.queryByTestId('platform-user-link-20-41')).not.toBeInTheDocument();
  });

  it('Escenario 1: Universo con MU → rol fijo ARC; con el nombre exacto vincula y recarga la lista', async () => {
    givenUsers([NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await openAndPick('Flota Norte');
    expect(screen.getByTestId('link-universe-role-fixed')).toHaveTextContent(
      'ya tiene Master of Universe'
    );
    const submit = screen.getByTestId('link-universe-submit');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('link-universe-name'), {
      target: { value: 'flota norte' },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('link-universe-name'), {
      target: { value: ' Flota Norte ' },
    });
    expect(submit).toBeEnabled();
    const before = usersFetches();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/cosmology/users/21/link-universe', {
        tenantId: 41,
        role: 'ARC',
        confirmUniverseName: 'Flota Norte',
      })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('link-universe-modal')).not.toBeInTheDocument()
    );
    await waitFor(() => expect(usersFetches()).toBe(before + 1));
  });

  it('Universo sin MU: deja elegir MU y lo envía', async () => {
    givenUsers([NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await openAndPick('Flota Sur');
    expect(screen.queryByTestId('link-universe-role-fixed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Arconauta (ARC)'));
    fireEvent.click(screen.getByText('Master of Universe (MU)'));
    fireEvent.change(screen.getByTestId('link-universe-name'), { target: { value: 'Flota Sur' } });
    fireEvent.click(screen.getByTestId('link-universe-submit'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/cosmology/users/21/link-universe', {
        tenantId: 42,
        role: 'MU',
        confirmUniverseName: 'Flota Sur',
      })
    );
  });

  it('sin Universo elegido el botón sigue apagado y Enter no envía nada', async () => {
    givenUsers([NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    fireEvent.click(await screen.findByTestId('platform-user-link-21-itinerant'));
    fireEvent.change(screen.getByTestId('link-universe-name'), {
      target: { value: 'Flota Norte' },
    });
    expect(screen.getByTestId('link-universe-submit')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('link-universe-modal'));
    const linkCalls = vi
      .mocked(api.post)
      .mock.calls.filter(([url]) => String(url).includes('link-universe'));
    expect(linkCalls).toHaveLength(0);
  });

  it('Enter con el nombre exacto envía igual que el botón', async () => {
    givenUsers([NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await openAndPick('Flota Norte');
    fireEvent.change(screen.getByTestId('link-universe-name'), {
      target: { value: 'Flota Norte' },
    });
    fireEvent.submit(screen.getByTestId('link-universe-modal'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/cosmology/users/21/link-universe', {
        tenantId: 41,
        role: 'ARC',
        confirmUniverseName: 'Flota Norte',
      })
    );
  });

  it('Escenarios 2–3: el error del servidor se muestra en español y la ventana sigue abierta', async () => {
    givenUsers([NOMAD]);
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { code: 'LINKED_USER_ALREADY_MEMBER' } },
    });
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await openAndPick('Flota Sur');
    fireEvent.change(screen.getByTestId('link-universe-name'), { target: { value: 'Flota Sur' } });
    fireEvent.click(screen.getByTestId('link-universe-submit'));
    expect(await screen.findByTestId('link-universe-error')).toHaveTextContent(
      'El usuario ya pertenece a un Universo.'
    );
    expect(screen.getByTestId('link-universe-modal')).toBeInTheDocument();
  });

  it('Cancelar cierra la ventana sin enviar nada', async () => {
    givenUsers([NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    fireEvent.click(await screen.findByTestId('platform-user-link-21-itinerant'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('link-universe-modal')).not.toBeInTheDocument();
    // El AuthProvider de testUtils hace su propio POST /auth/refresh: se mira solo la vinculación.
    expect(
      vi.mocked(api.post).mock.calls.some(([url]) => String(url).includes('link-universe'))
    ).toBe(false);
  });
});
