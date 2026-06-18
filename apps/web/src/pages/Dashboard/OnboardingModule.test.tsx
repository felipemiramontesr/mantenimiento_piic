import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import OnboardingModule from './OnboardingModule';
import usePermissions from '../../hooks/usePermissions';

import api from '../../api/client';

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));

vi.mock('../../api/client', () => ({
  default: { post: vi.fn() },
}));

const mockPerms = (opts: { omnipotent?: boolean; vimCentro?: boolean } = {}): void => {
  vi.mocked(usePermissions).mockReturnValue({
    hasPermission: (): boolean => false,
    hasAnyPermission: (): boolean => false,
    isOmnipotent: (): boolean => opts.omnipotent ?? false,
    isExternalClientOnly: (): boolean => false,
    isSuiteVIM: (): boolean => opts.vimCentro ?? false,
  });
};

const fillField = (labelRegex: RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(labelRegex), { target: { value } });
};

describe('OnboardingModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // auth/refresh rejects to keep auth state clean; other calls reject by default
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      throw new Error(`unmocked: ${url}`);
    });
  });

  // ─── Rendering guards ───────────────────────────────────────────────────────

  it('shows the universe form for Archon (omnipotent)', async () => {
    mockPerms({ omnipotent: true });
    render(<OnboardingModule />);
    await waitFor(() => expect(screen.getByTestId('universe-form')).toBeInTheDocument());
    expect(screen.queryByTestId('client-form')).not.toBeInTheDocument();
  });

  it('shows the client form for Centro VIM (isSuiteVIM)', async () => {
    mockPerms({ vimCentro: true });
    render(<OnboardingModule />);
    await waitFor(() => expect(screen.getByTestId('client-form')).toBeInTheDocument());
    expect(screen.queryByTestId('universe-form')).not.toBeInTheDocument();
  });

  it('shows both forms when omnipotent and vimCentro are both true', async () => {
    mockPerms({ omnipotent: true, vimCentro: true });
    render(<OnboardingModule />);
    await waitFor(() => {
      expect(screen.getByTestId('universe-form')).toBeInTheDocument();
      expect(screen.getByTestId('client-form')).toBeInTheDocument();
    });
  });

  it('shows no-access message when neither omnipotent nor vimCentro', async () => {
    mockPerms();
    render(<OnboardingModule />);
    await waitFor(() => expect(screen.getByText(/sin acceso/i)).toBeInTheDocument());
  });

  it('sets section title to Onboarding de Universos', async () => {
    mockPerms({ omnipotent: true });
    render(<OnboardingModule />);
    await waitFor(() =>
      expect(screen.getByTestId('layout-title')).toHaveTextContent('Onboarding de Universos')
    );
  });

  // ─── Universe form — tabs ───────────────────────────────────────────────────

  it('universe form defaults to ERP tab', async () => {
    mockPerms({ omnipotent: true });
    render(<OnboardingModule />);
    await waitFor(() => expect(screen.getByTestId('tab-erp')).toBeInTheDocument());
    expect(screen.getByText(/Propietario de Flotilla/i)).toBeInTheDocument();
  });

  it('universe form switches to VIM tab on click', async () => {
    mockPerms({ omnipotent: true });
    render(<OnboardingModule />);
    await screen.findByTestId('tab-vim');
    fireEvent.click(screen.getByTestId('tab-vim'));
    expect(screen.getByText(/Centro Especializado/i)).toBeInTheDocument();
  });

  // ─── Universe form — submission ─────────────────────────────────────────────

  it('submits /onboarding/universe with roleId 1 for ERP tab', async () => {
    mockPerms({ omnipotent: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      return { data: { success: true } };
    });

    render(<OnboardingModule />);
    await screen.findByTestId('universe-form');

    // ERP tab is default
    fillField(/^Usuario/i, 'flotilla.one');
    fillField(/^Correo/i, 'f@empresa.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fillField(/^RFC/i, 'RFC001');

    fireEvent.click(screen.getByTestId('btn-create-universe'));

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/onboarding/universe',
        expect.objectContaining({ roleId: 1, username: 'flotilla.one' })
      )
    );
    await waitFor(() => expect(screen.getByTestId('onboarding-status')).toHaveTextContent(/ERP/i));
  });

  it('submits /onboarding/universe with roleId 3 for VIM tab', async () => {
    mockPerms({ omnipotent: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      return { data: { success: true } };
    });

    render(<OnboardingModule />);
    await screen.findByTestId('tab-vim');
    fireEvent.click(screen.getByTestId('tab-vim'));

    fillField(/^Usuario/i, 'centro.vim');
    fillField(/^Correo/i, 'c@vim.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fillField(/^RFC/i, 'RFC002');

    fireEvent.click(screen.getByTestId('btn-create-universe'));

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/onboarding/universe',
        expect.objectContaining({ roleId: 3 })
      )
    );
    await waitFor(() => expect(screen.getByTestId('onboarding-status')).toHaveTextContent(/VIM/i));
  });

  it('shows error message from API on universe creation failure', async () => {
    mockPerms({ omnipotent: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      throw Object.assign(new Error('api error'), {
        response: { data: { message: 'Username already exists' } },
      });
    });

    render(<OnboardingModule />);
    await screen.findByTestId('universe-form');

    fillField(/^Usuario/i, 'dup.user');
    fillField(/^Correo/i, 'dup@x.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fillField(/^RFC/i, 'RFC003');
    fireEvent.click(screen.getByTestId('btn-create-universe'));

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent(/Username already exists/i)
    );
  });

  // ─── Client form — tabs ─────────────────────────────────────────────────────

  it('client form defaults to P.Privado tab', async () => {
    mockPerms({ vimCentro: true });
    render(<OnboardingModule />);
    await waitFor(() => expect(screen.getByTestId('tab-private')).toBeInTheDocument());
    expect(screen.getByText(/Registra un nuevo Propietario Privado/i)).toBeInTheDocument();
  });

  it('client form shows targetOwnerId field only on Familiar tab', async () => {
    mockPerms({ vimCentro: true });
    render(<OnboardingModule />);
    await screen.findByTestId('client-form');

    expect(screen.queryByLabelText(/ID del Propietario/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-familiar'));
    expect(screen.getByLabelText(/ID del Propietario/i)).toBeInTheDocument();
  });

  // ─── Client form — submission ───────────────────────────────────────────────

  it('submits /onboarding/client with roleId 4 for P.Privado tab', async () => {
    mockPerms({ vimCentro: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      return { data: { success: true } };
    });

    render(<OnboardingModule />);
    await screen.findByTestId('client-form');

    fillField(/^Usuario/i, 'privado.uno');
    fillField(/^Correo/i, 'p@vim.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fireEvent.click(screen.getByTestId('btn-create-client'));

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/onboarding/client',
        expect.objectContaining({ roleId: 4, username: 'privado.uno' })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent(
        /Propietario Privado registrado/i
      )
    );
  });

  it('submits /onboarding/client with roleId 5 and targetOwnerId for Familiar tab', async () => {
    mockPerms({ vimCentro: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      return { data: { success: true } };
    });

    render(<OnboardingModule />);
    await screen.findByTestId('client-form');
    fireEvent.click(screen.getByTestId('tab-familiar'));

    fillField(/^Usuario/i, 'familiar.uno');
    fillField(/^Correo/i, 'fam@vim.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fillField(/ID del Propietario/i, '42');
    fireEvent.click(screen.getByTestId('btn-create-client'));

    await waitFor(() =>
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/onboarding/client',
        expect.objectContaining({ roleId: 5, targetOwnerId: 42 })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent(/Familiar agregado/i)
    );
  });

  it('shows error message from API on client creation failure', async () => {
    mockPerms({ vimCentro: true });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') throw new Error('no session');
      throw Object.assign(new Error('api error'), {
        response: { data: { code: 'OWNER_NOT_FOUND' } },
      });
    });

    render(<OnboardingModule />);
    await screen.findByTestId('client-form');
    fillField(/^Usuario/i, 'x.user');
    fillField(/^Correo/i, 'x@x.mx');
    fillField(/^Contraseña/i, 'Archon@1234!');
    fireEvent.click(screen.getByTestId('btn-create-client'));

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent(/OWNER_NOT_FOUND/i)
    );
  });
});
