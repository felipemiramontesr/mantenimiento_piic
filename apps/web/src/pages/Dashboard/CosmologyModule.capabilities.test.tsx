import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '../../test/testUtils';
import CosmologyModule from './CosmologyModule';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';

/**
 * FC208 F2 — botón «Cúmulos» en cada fila de Universos: abre la gobernanza de capacidades y cada
 * mutación recarga la lista, así los contadores de Supercúmulos y Cúmulos activos se actualizan solos.
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));
vi.mock('./CosmologyModule/SecurityEvents/SecurityEventsCard', () => ({
  default: (): null => null,
}));
vi.mock('./CosmologyModule/PlatformUsers/PlatformUsersCard', () => ({
  default: (): null => null,
}));
vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

/** Estado del servidor simulado: el Supercúmulo MANT se activa con el POST. */
const server = { mantActive: false };

/** Respuestas GET según la ruta y el estado simulado. */
async function serverGet(url: string): Promise<{ data: unknown }> {
  const mantState = server.mantActive ? 'ACTIVE' : 'SUSPENDED';
  if (url.endsWith('/superclusters')) {
    return {
      data: {
        success: true,
        data: [
          { code: 'FLOTA', name: 'Flotilla', state: 'ACTIVE' },
          { code: 'MANT', name: 'Mantenimiento', state: mantState },
        ],
      },
    };
  }
  if (url.endsWith('/clusters')) {
    return {
      data: {
        success: true,
        data: [{ code: 'OT', name: 'Órdenes', superclusterCode: 'MANT', state: mantState }],
      },
    };
  }
  const universe = {
    id: 1,
    label: 'FMS Base',
    universeTypeCode: 'FMS',
    activeSuperclusters: server.mantActive ? 2 : 1,
    activeClusters: server.mantActive ? 1 : 0,
  };
  return { data: { success: true, data: url === '/cosmology/universes' ? [universe] : [] } };
}

beforeEach(() => {
  vi.clearAllMocks();
  server.mantActive = false;
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => true,
    isOmegaStrict: (): boolean => true,
  });
  vi.mocked(api.get).mockImplementation(serverGet);
  vi.mocked(api.post).mockImplementation(async (url: string) => {
    if (url === '/cosmology/universes/1/superclusters') {
      server.mantActive = true;
      return { data: { success: true } };
    }
    throw new Error('no session');
  });
});

describe('FC208 F2 — CosmologyModule · Cúmulos', () => {
  it('«Cúmulos» abre la gobernanza del Universo; activar refresca los contadores de la fila', async () => {
    render(<CosmologyModule />);
    const row = await screen.findByTestId('cosmology-universe-row-1');
    const cells = (): HTMLElement[] => within(row).getAllByRole('cell');
    expect(cells()[2]).toHaveTextContent('1');
    expect(cells()[3]).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('cosmology-universe-manage-1'));
    expect(await screen.findByText('Gobernanza de Capacidades — FMS Base')).toBeInTheDocument();
    const toggle = await screen.findByTestId('capability-sc-toggle-MANT');
    expect(toggle).toHaveTextContent('Activar Supercúmulo');

    fireEvent.click(toggle);
    await waitFor(() => expect(cells()[2]).toHaveTextContent('2'));
    expect(cells()[3]).toHaveTextContent('1');
    await waitFor(() =>
      expect(screen.getByTestId('capability-sc-toggle-MANT')).toHaveTextContent(
        'Suspender Supercúmulo'
      )
    );
  });

  it('Cerrar devuelve la tabla sin el modal', async () => {
    render(<CosmologyModule />);
    fireEvent.click(await screen.findByTestId('cosmology-universe-manage-1'));
    await screen.findByTestId('universe-capabilities-modal');
    fireEvent.click(screen.getByText('Cerrar'));
    expect(screen.queryByTestId('universe-capabilities-modal')).toBeNull();
    expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
  });
});
