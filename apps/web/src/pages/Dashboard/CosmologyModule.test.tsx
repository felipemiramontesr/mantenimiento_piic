import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import CosmologyModule from './CosmologyModule';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';

/**
 * FC161 F1 — Cosmology_Admin_Ui: Universes_List_Create_Destroy.
 * Covers Gherkin Scenarios 1, 3, 4, 5 of `161_FC_Cosmology_Admin_Ui.md`
 * (Scenario 2 — Ω-gating — is covered at the Sidebar level; here we cover
 * the page-level "sin acceso" fallback for a non-Ω actor).
 */

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockPerms = (opts: { omega?: boolean } = {}): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => opts.omega ?? false,
    isOmegaStrict: (): boolean => opts.omega ?? false,
  });
};

const MOCK_UNIVERSES = [
  { id: 1, label: 'FMS Base', universeTypeCode: 'FMS', activeSuperclusters: 5, activeClusters: 1 },
];

describe('CosmologyModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // AuthProvider (real, unmocked via testUtils) fires POST /auth/refresh on
    // mount — reject it distinctly so it never consumes a test's
    // mockResolvedValueOnce queued for the create-universe POST.
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      throw new Error(`unmocked: ${url}`);
    });
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: MOCK_UNIVERSES } });
  });

  it('COSMOLOGY-UI-ACCESS-1: no-Ω sees the access-denied fallback, no API call', async () => {
    mockPerms({ omega: false });
    render(<CosmologyModule />);
    expect(await screen.findByText(/sin acceso/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('Scenario 1 — Ω sees the real Universe directory (fix of the dead /onboarding/universes page)', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
    });
    expect(screen.getByText('FMS Base')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/cosmology/universes');
  });

  it('renders the error state when the list call fails', async () => {
    mockPerms({ omega: true });
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network error'));
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universes-error')).toBeInTheDocument();
    });
  });

  it('Scenario 3 — Ω creates a Universe, list refreshes without reload', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() =>
      expect(screen.getByTestId('cosmology-universes-table')).toBeInTheDocument()
    );

    // Set up AFTER mount — AuthProvider's own POST /auth/refresh on mount
    // must consume the base (rejecting) implementation, not this queued value.
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true, data: { tenantId: 2 } } });
    fireEvent.change(screen.getByTestId('create-universe-label'), {
      target: { value: 'Nuevo Universo' },
    });
    fireEvent.click(screen.getByTestId('create-universe-submit'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/cosmology/universes', {
        label: 'Nuevo Universo',
        universeTypeCode: 'FMS',
        ownerTypeCode: 'FLOTILLA',
      });
    });
    // refetch after create — 2nd GET call
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('Scenario 4 — blocked destroy (409 UNIVERSE_NOT_ZERO_STATE) shows readable es-MX blockers, no removal', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cosmology-universe-destroy-1'));
    fireEvent.change(screen.getByTestId('destroy-universe-confirm-label'), {
      target: { value: 'FMS Base' },
    });

    vi.mocked(api.delete).mockRejectedValueOnce({
      response: { data: { code: 'UNIVERSE_NOT_ZERO_STATE', details: { fleet_units: 3 } } },
    });
    fireEvent.click(screen.getByTestId('destroy-universe-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('destroy-universe-blockers')).toBeInTheDocument();
    });
    expect(screen.getByText(/Unidades de flotilla: 3/)).toBeInTheDocument();
    // still listed — destruction did not go through
    expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
  });

  it('Scenario 5 — successful destroy (zero-state) removes the Universe from the list', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cosmology-universe-destroy-1'));
    fireEvent.change(screen.getByTestId('destroy-universe-confirm-label'), {
      target: { value: 'FMS Base' },
    });

    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });
    fireEvent.click(screen.getByTestId('destroy-universe-submit'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/cosmology/universes/1', { data: undefined });
    });
    await waitFor(() => {
      expect(screen.queryByTestId('cosmology-universe-row-1')).not.toBeInTheDocument();
    });
  });

  it('destroy confirm button stays disabled until the typed label matches exactly', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('cosmology-universe-destroy-1'));
    expect(screen.getByTestId('destroy-universe-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('destroy-universe-confirm-label'), {
      target: { value: 'no coincide' },
    });
    expect(screen.getByTestId('destroy-universe-submit')).toBeDisabled();
  });

  it('optional reason (≥5 chars) is sent to DELETE when provided', async () => {
    mockPerms({ omega: true });
    render(<CosmologyModule />);
    await waitFor(() => {
      expect(screen.getByTestId('cosmology-universe-row-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('cosmology-universe-destroy-1'));
    fireEvent.change(screen.getByTestId('destroy-universe-confirm-label'), {
      target: { value: 'FMS Base' },
    });
    fireEvent.change(screen.getByTestId('destroy-universe-reason'), {
      target: { value: 'Ya no se usa este Universo' },
    });
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(screen.getByTestId('destroy-universe-submit'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/cosmology/universes/1', {
        data: { reason: 'Ya no se usa este Universo' },
      });
    });
  });
});
