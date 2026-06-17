import React from 'react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import api from '../../api/client';
import OwnerProfilePanel from './OwnerProfilePanel';

/**
 * Archon Test: OwnerProfilePanel
 * Feature Contract: Archon_Master_Fase7_OwnerProfile_ViewEdit — Fase 7-B
 * Scenario P1: loading state shown on mount
 * Scenario P2: profile loaded from /owners/me/profile on mount
 * Scenario P3: RFC label = "RFC (Opcional)" for Rol 4 (PRIVATE)
 * Scenario P4: Razón Social label = "Nombre Legal" for Rol 4
 * Scenario P5a: Especialidades shown for Rol 3 (CENTER)
 * Scenario P5b: Especialidades hidden for Rol 1 (FLOTILLA)
 * Scenario P6: address hydrated when neighborhoodId exists
 * Scenario P7: PATCH /owners/me/profile called on save + success shown
 * Scenario P8: error message shown on failed save
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: mockUseAuth };
});

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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

  it('shows especialidades field for Rol 3 — Scenario P5a', async (): Promise<void> => {
    setupAuth(3, 'CENTER');
    (api.get as Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...PROFILE_DATA,
          especialidades: 'Motores',
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
});
