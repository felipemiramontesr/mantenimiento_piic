import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import api from '../../../api/client';
import UniverseCapabilitiesModal, { PARENT_INACTIVE_HINT } from './UniverseCapabilitiesModal';
import type { UniverseRow } from './CosmologyForms';

/**
 * FC208 F1 (T1 · §24.5) — gobernanza de Supercúmulos y Cúmulos: agrupación, botón por estado, cúmulos
 * deshabilitados salvo padre ACTIVE, contrato POST/DELETE, bloqueo en vuelo, errores y reintento.
 */

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const UNIVERSE: UniverseRow = {
  id: 41,
  label: 'Flota Norte',
  universeTypeCode: 'FMS',
  activeSuperclusters: 1,
  activeClusters: 1,
};
const BASE = '/cosmology/universes/41';

const SUPERCLUSTERS = [
  { code: 'FLOTA', name: 'Flotilla y Activos', state: 'ACTIVE' },
  { code: 'MANT', name: 'Mantenimiento', state: 'SUSPENDED' },
  { code: 'FIN', name: 'Finanzas', state: 'NEVER_ACTIVATED' },
  { code: 'CRM', name: 'Relación con Clientes', state: 'REMOVED' },
];
const CLUSTERS = [
  { code: 'GPS', name: 'Rastreo GPS', superclusterCode: 'FLOTA', state: 'ACTIVE' },
  { code: 'TCO', name: 'Costo Total', superclusterCode: 'FLOTA', state: 'SUSPENDED' },
  { code: 'OT', name: 'Órdenes de Trabajo', superclusterCode: 'MANT', state: 'SUSPENDED' },
  { code: 'CXP', name: 'Cuentas por Pagar', superclusterCode: 'FIN', state: 'NEVER_ACTIVATED' },
  { code: 'LEADS', name: 'Prospectos', superclusterCode: 'CRM', state: 'REMOVED' },
];

/** Respuestas de las dos listas en la forma real (`{ success, data }`). */
function givenCapabilities(): void {
  vi.mocked(api.get).mockImplementation(async (url: string) => ({
    data: { success: true, data: url.endsWith('/superclusters') ? SUPERCLUSTERS : CLUSTERS },
  }));
}

const onClose = vi.fn();
const onChanged = vi.fn();

/** Abre el modal y espera a que pinte los Supercúmulos. */
async function openModal(): Promise<void> {
  render(<UniverseCapabilitiesModal universe={UNIVERSE} onClose={onClose} onChanged={onChanged} />);
  await screen.findByTestId('capability-sc-FLOTA');
}

beforeEach(() => {
  vi.clearAllMocks();
  givenCapabilities();
  vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
});

describe('UniverseCapabilitiesModal — montaje y agrupación', () => {
  it('universe null no monta nada ni consulta', () => {
    const { container } = render(
      <UniverseCapabilitiesModal universe={null} onClose={onClose} onChanged={onChanged} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('título, max-w-3xl y cada Cúmulo bajo su Supercúmulo, con su estado', async () => {
    await openModal();
    expect(screen.getByText('Gobernanza de Capacidades — Flota Norte')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('max-w-3xl');
    expect(api.get).toHaveBeenCalledWith(`${BASE}/superclusters`);
    expect(api.get).toHaveBeenCalledWith(`${BASE}/clusters`);
    const flota = within(screen.getByTestId('capability-sc-FLOTA'));
    expect(flota.getByText('Flotilla y Activos [FLOTA]')).toBeInTheDocument();
    expect(flota.getByText('Rastreo GPS')).toBeInTheDocument();
    expect(flota.queryByText('Órdenes de Trabajo')).toBeNull();
    expect(flota.getAllByText('Activo')).toHaveLength(2); // el Supercúmulo y GPS
    expect(flota.getAllByText('Suspendido')).toHaveLength(1); // TCO
    expect(
      within(screen.getByTestId('capability-sc-MANT')).getAllByText('Suspendido')
    ).toHaveLength(2);
    expect(within(screen.getByTestId('capability-sc-FIN')).getAllByText('Inactivo')).toHaveLength(
      2
    );
    expect(within(screen.getByTestId('capability-sc-CRM')).getAllByText('Inactivo')).toHaveLength(
      2
    );
  });
});

describe('UniverseCapabilitiesModal — T1', () => {
  it('fila 2: Supercúmulo ACTIVE → DELETE en la ruta, avisa y recarga', async () => {
    await openModal();
    const button = screen.getByTestId('capability-sc-toggle-FLOTA');
    expect(button).toHaveTextContent('Suspender Supercúmulo');
    fireEvent.click(button);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(api.delete).toHaveBeenCalledWith(`${BASE}/superclusters/FLOTA`);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(4));
  });

  it.each(['MANT', 'FIN', 'CRM'])(
    'fila 1: Supercúmulo %s no ACTIVE → «Activar Supercúmulo» con POST { superclusterCode }',
    async (code) => {
      await openModal();
      const button = screen.getByTestId(`capability-sc-toggle-${code}`);
      expect(button).toHaveTextContent('Activar Supercúmulo');
      fireEvent.click(button);
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(`${BASE}/superclusters`, { superclusterCode: code })
      );
    }
  );

  it('fila 3: Cúmulo no ACTIVE con padre ACTIVE → «Activar» con POST { clusterCode }', async () => {
    await openModal();
    const button = screen.getByTestId('capability-cluster-toggle-TCO');
    expect(button).toHaveTextContent('Activar');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(`${BASE}/clusters`, { clusterCode: 'TCO' })
    );
  });

  it('fila 4: Cúmulo ACTIVE con padre ACTIVE → «Suspender» con DELETE en la ruta', async () => {
    await openModal();
    const button = screen.getByTestId('capability-cluster-toggle-GPS');
    expect(button).toHaveTextContent('Suspender');
    fireEvent.click(button);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${BASE}/clusters/GPS`));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it.each(['OT', 'CXP', 'LEADS'])(
    'fila 5: con el padre no ACTIVE, el Cúmulo %s queda deshabilitado con el aviso',
    async (code) => {
      await openModal();
      const button = screen.getByTestId(`capability-cluster-toggle-${code}`);
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', PARENT_INACTIVE_HINT);
      fireEvent.click(button);
      expect(api.post).not.toHaveBeenCalled();
    }
  );
});

describe('UniverseCapabilitiesModal — en vuelo, errores y cierre', () => {
  it('con una mutación en vuelo se deshabilitan todos los botones', async () => {
    let finish: () => void = () => undefined;
    vi.mocked(api.delete).mockReturnValue(
      new Promise((resolve) => {
        finish = (): void => resolve({ data: { success: true } });
      })
    );
    await openModal();
    fireEvent.click(screen.getByTestId('capability-sc-toggle-FLOTA'));
    expect(screen.getByTestId('capability-sc-toggle-MANT')).toBeDisabled();
    expect(screen.getByTestId('capability-cluster-toggle-GPS')).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByTestId('capability-sc-toggle-MANT')).toBeEnabled());
  });

  it('si la mutación falla, muestra el motivo y no avisa', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { code: 'SUPERCLUSTER_NOT_ACTIVE' } },
    });
    await openModal();
    fireEvent.click(screen.getByTestId('capability-cluster-toggle-TCO'));
    expect(await screen.findByTestId('capabilities-error')).toHaveTextContent(
      'El Supercúmulo padre debe estar activo (§24.5).'
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('si la carga falla, muestra el error y «Reintentar» vuelve a consultar', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('red'));
    render(
      <UniverseCapabilitiesModal universe={UNIVERSE} onClose={onClose} onChanged={onChanged} />
    );
    expect(screen.getByTestId('capabilities-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('capabilities-error')).toHaveTextContent(
      'No se pudo completar la operación'
    );
    fireEvent.click(screen.getByTestId('capabilities-retry'));
    expect(await screen.findByTestId('capability-sc-FLOTA')).toBeInTheDocument();
    expect(screen.queryByTestId('capabilities-error')).toBeNull();
  });

  it('«Cerrar» llama onClose', async () => {
    await openModal();
    fireEvent.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
