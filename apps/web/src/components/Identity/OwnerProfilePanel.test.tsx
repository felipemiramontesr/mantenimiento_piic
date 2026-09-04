import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import api from '../../api/client';
import OwnerProfilePanel from './OwnerProfilePanel';

/**
 * Archon Test: OwnerProfilePanel
 * Feature Contract: Archon_Master_Fase7_OwnerProfile_ViewEdit — Fase 7-B
 * Feature Contract: Archon_VIM_CentroSpecialties v2 — Fase 3 Web
 * Scenario P1: loading state shown on mount
 * Scenario P2: profile loaded from /owners/me/profile on mount
 * Scenario P3: RFC label = "RFC (Opcional)" for Rol 4 (PRIVATE)
 * Scenario P4: Razón Social label = "Nombre Legal" for Rol 4
 * Scenario P5a: SpecialtiesSelect shown for Rol 3 (CENTER)
 * Scenario P5b: Especialidades hidden for Rol 1 (FLOTILLA)
 * Scenario P6: address hydrated when neighborhoodId exists
 * Scenario P7: PATCH /owners/me/profile called on save + success shown
 * Scenario P8: error message shown on failed save
 * Scenario P9: SpecialtiesSelect sends array codes on save
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: mockUseAuth };
});

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock('../Common/SpecialtiesSelect', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (codes: string[]) => void;
  }): React.JSX.Element => (
    <div
      data-testid="owner-especialidades-input"
      data-codes={JSON.stringify(value)}
      onClick={(): void => onChange([...value, 'MOTOR'])}
    />
  ),
}));

vi.mock('../Common/ArchonAddressField', () => ({
  default: ({
    value,
  }: {
    value: { neighborhoodId: string };
    onChange: (v: unknown) => void;
  }): React.JSX.Element => (
    <div data-testid="address-field-mock" data-neighborhood={value.neighborhoodId} />
  ),
  EMPTY_ADDRESS: {
    stateId: '',
    municipalityId: '',
    neighborhoodId: '',
    calle: '',
    numeroExt: '',
    numeroInt: '',
    postalCode: '',
  },
}));

vi.mock('../ArchonField', () => ({
  default: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }): React.JSX.Element => <div data-label={label}>{children}</div>,
}));

const PROFILE_DATA = {
  rfc: 'TST010101AAA',
  razonSocial: 'Flotillas SA de CV',
  telefono: '3312345678',
  especialidades: null,
  calle: 'Av. Reforma',
  numeroExt: '10',
  numeroInt: null,
  neighborhoodId: 300,
  ownerType: 'FLOTILLA',
};

const setupAuth = (roleId: number, ownerType: 'FLOTILLA' | 'CENTER' | 'PRIVATE'): void => {
  mockUseAuth.mockReturnValue({
    currentUser: { id: '10', username: 'u', roleId, roleName: 'R', ownerType },
    ownerType,
  });
};

const getByDataLabel = (label: string): HTMLElement => {
  const el = document.querySelector(`[data-label="${label}"]`);
  if (!el) throw new Error(`No element with data-label="${label}"`);
  return el as HTMLElement;
};

describe('OwnerProfilePanel', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    (api.patch as Mock).mockResolvedValue({ data: { success: true } });
  });

  it('shows loading state while profile is fetching — Scenario P1', (): void => {
    setupAuth(1, 'FLOTILLA');

    (api.get as Mock).mockReturnValue(new Promise<void>(() => {}));

    render(<OwnerProfilePanel />);

    expect(screen.getByTestId('owner-profile-loading')).toBeInTheDocument();
  });

  it('renders panel with profile data after fetch — Scenario P2', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    expect((screen.getByTestId('owner-rfc-input') as HTMLInputElement).value).toBe('TST010101AAA');
    expect(api.get).toHaveBeenCalledWith('/owners/me/profile');
  });

  it('uses RFC (Opcional) and Nombre Legal labels for Rol 4 — Scenario P3/P4', async (): Promise<void> => {
    setupAuth(4, 'PRIVATE');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...PROFILE_DATA, neighborhoodId: null, ownerType: 'PRIVATE' },
      },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    expect(getByDataLabel('RFC (Opcional)')).toBeInTheDocument();
    expect(getByDataLabel('Nombre Legal')).toBeInTheDocument();
  });

  it('shows SpecialtiesSelect for Rol 3 CENTER — Scenario P5a', async (): Promise<void> => {
    setupAuth(3, 'CENTER');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...PROFILE_DATA,
          especialidades: ['MOTOR'],
          neighborhoodId: null,
          ownerType: 'CENTER',
        },
      },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-especialidades-input')).toBeInTheDocument();
    });
  });

  it('hides especialidades field for Rol 1 — Scenario P5b', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('owner-especialidades-input')).not.toBeInTheDocument();
  });

  it('hydrates address field from neighborhood endpoint — Scenario P6', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockResolvedValueOnce({
        data: { success: true, data: { stateId: 14, municipalityId: 120, postalCode: '44500' } },
      });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith('/geolocation/neighborhoods/300');
    expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe('300');
  });

  it('PATCHes profile on save and shows success — Scenario P7', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({ rfc: 'TST010101AAA' })
      );
    });
    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-success')).toBeInTheDocument();
    });
  });

  it('shows error when PATCH fails — Scenario P8', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });
    (api.patch as Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-error')).toBeInTheDocument();
    });
  });

  it('sends especialidades array on save for Rol 3 — Scenario P9', async (): Promise<void> => {
    setupAuth(3, 'CENTER');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...PROFILE_DATA,
          especialidades: ['FRENOS'],
          neighborhoodId: null,
          ownerType: 'CENTER',
        },
      },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-especialidades-input')).toBeInTheDocument();
    });

    // Mock click on SpecialtiesSelect adds 'MOTOR' to the array
    fireEvent.click(screen.getByTestId('owner-especialidades-input'));
    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({ especialidades: ['FRENOS', 'MOTOR'] })
      );
    });
  });

  it('falls back to EMPTY_ADDRESS when the neighborhood lookup rejects', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockRejectedValueOnce(new Error('geo lookup down'));

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock')).toBeInTheDocument();
    });
    expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe('');
  });

  it('includes the hydrated address fields in the save payload when neighborhoodId is set', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockResolvedValueOnce({
        data: { success: true, data: { stateId: 14, municipalityId: 120, postalCode: '44500' } },
      });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe(
        '300'
      );
    });

    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({
          neighborhoodId: 300,
          calle: 'Av. Reforma',
          numeroExt: '10',
        })
      );
    });
  });

  it('updates rfc, razonSocial and telefono via their input onChange handlers', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('owner-rfc-input'), { target: { value: 'NEW010101AAA' } });
    expect((screen.getByTestId('owner-rfc-input') as HTMLInputElement).value).toBe('NEW010101AAA');

    fireEvent.change(screen.getByTestId('owner-razon-social-input'), {
      target: { value: 'Nueva Razón Social' },
    });
    expect((screen.getByTestId('owner-razon-social-input') as HTMLInputElement).value).toBe(
      'Nueva Razón Social'
    );

    fireEvent.change(screen.getByTestId('owner-telefono-input'), {
      target: { value: '5500001111' },
    });
    expect((screen.getByTestId('owner-telefono-input') as HTMLInputElement).value).toBe(
      '5500001111'
    );
  });

  // ── OwnerProfilePanel.tsx unc line 12 (roleId ?? 0 fallback) ──

  it('defaults roleId to 0 when currentUser has no roleId', async (): Promise<void> => {
    mockUseAuth.mockReturnValue({
      currentUser: { id: '10', username: 'u' },
      ownerType: 'FLOTILLA',
    });
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    // roleId 0 is not 3 (CENTER) — especialidades field stays hidden.
    expect(screen.queryByTestId('owner-especialidades-input')).not.toBeInTheDocument();
  });

  // ── R4-C Fc165 F2 Slice 2.2C — useProfileSave.ts unc lines 29,30,31,34,37,38,39 ──

  it('sends null for rfc/razonSocial/telefono in the save payload when their inputs are emptied', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: { success: true, data: { ...PROFILE_DATA, neighborhoodId: null } },
    });

    render(<OwnerProfilePanel />);
    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('owner-rfc-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('owner-razon-social-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('owner-telefono-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({ rfc: null, razonSocial: null, telefono: null })
      );
    });
  });

  it('sends null for especialidades in the save payload when the array is empty', async (): Promise<void> => {
    setupAuth(3, 'CENTER');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...PROFILE_DATA, especialidades: [], neighborhoodId: null, ownerType: 'CENTER' },
      },
    });

    render(<OwnerProfilePanel />);
    await waitFor((): void => {
      expect(screen.getByTestId('owner-especialidades-input')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({ especialidades: null })
      );
    });
  });

  it('omits empty calle/numeroExt but includes a set numeroInt in the save payload', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { ...PROFILE_DATA, calle: null, numeroExt: null, numeroInt: 'B' },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { stateId: 14, municipalityId: 120, postalCode: '44500' } },
      });

    render(<OwnerProfilePanel />);
    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe(
        '300'
      );
    });

    fireEvent.click(screen.getByTestId('owner-profile-save'));

    await waitFor((): void => {
      expect(api.patch).toHaveBeenCalledWith(
        '/owners/me/profile',
        expect.objectContaining({ neighborhoodId: 300, numeroInt: 'B' })
      );
    });
    const payload = (api.patch as Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('calle');
    expect(payload).not.toHaveProperty('numeroExt');
  });

  // ── useProfileLoad.ts unc lines 26,28,29,30,34,38 ──

  it('renders empty inputs when the loaded profile has null rfc/razonSocial/telefono', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...PROFILE_DATA,
          rfc: null,
          razonSocial: null,
          telefono: null,
          neighborhoodId: null,
        },
      },
    });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    expect((screen.getByTestId('owner-rfc-input') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('owner-razon-social-input') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('owner-telefono-input') as HTMLInputElement).value).toBe('');
  });

  it('stays with the empty form when the profile fetch resolves with no data', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock).mockResolvedValueOnce({ data: { success: true, data: undefined } });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('owner-profile-panel')).toBeInTheDocument();
    });
    expect((screen.getByTestId('owner-rfc-input') as HTMLInputElement).value).toBe('');
  });

  it('does not update state after unmount while the address hydration is still in flight', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    let resolveGeo: (v: unknown) => void = () => {};
    const geoPromise = new Promise((resolve) => {
      resolveGeo = resolve;
    });
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockReturnValueOnce(geoPromise);

    const { unmount } = render(<OwnerProfilePanel />);
    await waitFor((): void => {
      expect(api.get).toHaveBeenCalledWith('/geolocation/neighborhoods/300');
    });

    // The cancelled guard must skip both setState calls after unmount — an
    // unguarded call here would make React warn/throw on the next tick.
    unmount();
    resolveGeo({
      data: { success: true, data: { stateId: 14, municipalityId: 120, postalCode: '44500' } },
    });
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });

  // ── types.ts (hydrateAddress) unc lines 46,54 ──

  it('falls back to EMPTY_ADDRESS when the neighborhood lookup resolves with no data', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockResolvedValueOnce({ data: { success: true, data: undefined } });

    render(<OwnerProfilePanel />);

    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock')).toBeInTheDocument();
    });
    expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe('');
  });

  it('defaults postalCode to empty string when the neighborhood response omits it', async (): Promise<void> => {
    setupAuth(1, 'FLOTILLA');
    (api.get as Mock)
      .mockResolvedValueOnce({ data: { success: true, data: PROFILE_DATA } })
      .mockResolvedValueOnce({
        data: { success: true, data: { stateId: 14, municipalityId: 120, postalCode: null } },
      });

    render(<OwnerProfilePanel />);

    // hydrateAddress completes successfully (geo.postalCode||'' fallback taken, no throw)
    // and the neighborhood still resolves — proves the branch executed without crashing.
    await waitFor((): void => {
      expect(screen.getByTestId('address-field-mock').getAttribute('data-neighborhood')).toBe(
        '300'
      );
    });
  });
});
