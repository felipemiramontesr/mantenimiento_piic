import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../../test/testUtils';
import api from '../../../../api/client';
import PlatformUsersCard from './PlatformUsersCard';
import { describeSovereignActionError, PlatformUser } from './platformUsersApi';
import type { UniverseRow } from '../CosmologyForms';

/**
 * FC204 F4 — Consola de Usuarios de Plataforma (Ω): Escenario 4 (filtro por Universo, columna del
 * Universo) y Escenario 5 (la acción soberana no se ejecuta sin el nombre exacto del Universo).
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
  },
  {
    id: 42,
    label: 'Flota Sur',
    universeTypeCode: 'FMS',
    activeSuperclusters: 5,
    activeClusters: 1,
  },
] as unknown as UniverseRow[];

const MEMBER: PlatformUser = {
  id: 20,
  username: 'arc.user',
  fullName: 'Arc User',
  email: 'arc@piic.mx',
  isActive: true,
  tenantId: 41,
  tenantName: 'Flota Norte',
  cosmonautType: 'ARC',
};
const NOMAD: PlatformUser = {
  id: 21,
  username: 'nomad',
  fullName: null,
  email: 'nomad@piic.mx',
  isActive: false,
  tenantId: null,
  tenantName: null,
  cosmonautType: null,
};

/** Respuesta de `GET /cosmology/users` (el `AuthProvider` de testUtils hace otras llamadas por URL). */
function givenUsers(users: PlatformUser[], total = users.length): void {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/cosmology/users') return { data: { success: true, data: users, total } };
    return { data: {} };
  });
}

/** Parámetros de la última consulta de la consola. */
function lastUsersParams(): Record<string, unknown> {
  const calls = vi.mocked(api.get).mock.calls.filter(([url]) => url === '/cosmology/users');
  return (calls.at(-1)?.[1] as { params: Record<string, unknown> }).params;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
});

describe('FC204 F4 — PlatformUsersCard', () => {
  it('lista cada usuario con el nombre de su Universo; el itinerante no ofrece acciones', async () => {
    givenUsers([MEMBER, NOMAD]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    expect(await screen.findByTestId('platform-user-row-20-41')).toHaveTextContent('Flota Norte');
    expect(screen.getByTestId('platform-user-row-21-itinerant')).toHaveTextContent('Itinerante');
    expect(screen.getByTestId('platform-user-reset-mfa-20-41')).toBeEnabled();
    expect(screen.getByTestId('platform-user-reset-mfa-21-itinerant')).toBeDisabled();
    expect(screen.getByTestId('platform-user-delete-21-itinerant')).toBeDisabled();
    expect(screen.getByTestId('platform-users-total')).toHaveTextContent('2 usuario(s)');
    expect(lastUsersParams()).toEqual({ page: 1, pageSize: 25 });
  });

  it('Escenario 4: filtrar por un Universo o por itinerantes cambia el tenantId de la consulta', async () => {
    givenUsers([MEMBER]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await screen.findByTestId('platform-user-row-20-41');
    fireEvent.click(screen.getByText('Todos los Universos'));
    fireEvent.click(screen.getByText('Flota Sur'));
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ tenantId: 42, page: 1 }));
    fireEvent.click(screen.getByText('Flota Sur'));
    fireEvent.click(screen.getByText('Itinerantes (sin Universo)'));
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ tenantId: 'itinerant' }));
    fireEvent.click(screen.getByText('Itinerantes (sin Universo)'));
    fireEvent.click(screen.getByText('Todos los Universos'));
    await waitFor(() => expect(lastUsersParams()).not.toHaveProperty('tenantId'));
  });

  it('la búsqueda se aplica al enviar y la paginación avanza y retrocede', async () => {
    givenUsers([MEMBER], 60);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    await screen.findByTestId('platform-user-row-20-41');
    expect(screen.getByTestId('platform-users-page')).toHaveTextContent('1 / 3');
    expect(screen.getByTestId('platform-users-prev')).toBeDisabled();
    fireEvent.click(screen.getByTestId('platform-users-next'));
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ page: 2 }));
    fireEvent.click(screen.getByTestId('platform-users-prev'));
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ page: 1 }));
    fireEvent.change(screen.getByTestId('platform-users-search'), { target: { value: ' arc ' } });
    expect(lastUsersParams()).not.toHaveProperty('q');
    fireEvent.submit(screen.getByTestId('platform-users-filters'));
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ q: 'arc', page: 1 }));
  });

  it('muestra el error de carga', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('500'));
    render(<PlatformUsersCard universes={UNIVERSES} />);
    expect(await screen.findByTestId('platform-users-error')).toBeInTheDocument();
  });

  it('Escenario 5: restablecer 2FA solo se envía con el nombre exacto del Universo', async () => {
    givenUsers([MEMBER]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    fireEvent.click(await screen.findByTestId('platform-user-reset-mfa-20-41'));
    const submit = screen.getByTestId('sovereign-action-submit');
    expect(screen.queryByTestId('sovereign-action-reason')).not.toBeInTheDocument();
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('sovereign-action-universe-name'), {
      target: { value: 'flota norte' },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('sovereign-action-universe-name'), {
      target: { value: 'Flota Norte ' },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/cosmology/users/20/mfa/reset', {
        confirmUniverseName: 'Flota Norte',
      })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('sovereign-action-modal')).not.toBeInTheDocument()
    );
  });

  it('Escenario 5: eliminar exige además un motivo de 5+ caracteres y envía nombre y motivo', async () => {
    givenUsers([MEMBER]);
    render(<PlatformUsersCard universes={UNIVERSES} />);
    fireEvent.click(await screen.findByTestId('platform-user-delete-20-41'));
    fireEvent.change(screen.getByTestId('sovereign-action-universe-name'), {
      target: { value: 'Flota Norte' },
    });
    const submit = screen.getByTestId('sovereign-action-submit');
    fireEvent.change(screen.getByTestId('sovereign-action-reason'), { target: { value: 'baja' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('sovereign-action-reason'), {
      target: { value: '  Baja por depuración  ' },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/auth/users/20', {
        data: { reason: 'Baja por depuración', confirmUniverseName: 'Flota Norte' },
      })
    );
  });

  it('muestra el error del servidor y deja el modal abierto; Cancelar lo cierra', async () => {
    givenUsers([MEMBER]);
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { code: 'MFA_NOT_ENROLLED' } },
    });
    render(<PlatformUsersCard universes={UNIVERSES} />);
    fireEvent.click(await screen.findByTestId('platform-user-reset-mfa-20-41'));
    fireEvent.change(screen.getByTestId('sovereign-action-universe-name'), {
      target: { value: 'Flota Norte' },
    });
    fireEvent.click(screen.getByTestId('sovereign-action-submit'));
    expect(await screen.findByTestId('sovereign-action-error')).toHaveTextContent(
      'no tiene 2FA configurado'
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('sovereign-action-modal')).not.toBeInTheDocument();
  });
});

describe('describeSovereignActionError', () => {
  it.each([
    [{ response: { data: { code: 'UNIVERSE_NAME_MISMATCH' } } }, 'no coincide'],
    [{ response: { data: { code: 'USER_WITHOUT_UNIVERSE' } } }, 'ningún Universo'],
    [{ response: { data: { code: 'USER_NOT_FOUND' } } }, 'ya no existe'],
    [{ response: { data: { error: 'FORBIDDEN' } } }, 'exclusiva de GrayMan'],
    [{ response: { data: { code: 'OTRO' } } }, 'No se pudo completar'],
    [new Error('red'), 'No se pudo completar'],
  ])('%#: traduce el código del backend', (err, text) => {
    expect(describeSovereignActionError(err)).toContain(text);
  });
});
