import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/testUtils';
import RenameUniverseModal from './RenameUniverseModal';
import api from '../../../api/client';

/**
 * FC192 — modal "Renombrar Universo": validación en vivo, envío del PATCH, error 409 amigable y
 * cierre solo tras el éxito. 0 red: `api` mockeado.
 */

vi.mock('../../../api/client', () => ({ default: { patch: vi.fn() } }));
// El `AuthProvider` real de testUtils hace su propio `POST /auth/refresh`: se sustituye por un
// passthrough (mismo ajuste que las pruebas de MailDiagnostic) para que solo cuente el PATCH del modal.
vi.mock('../../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../context/AuthContext')>();
  return {
    ...actual,
    AuthProvider: ({ children }: { children: ReactNode }): ReactNode => children,
  };
});

const UNIVERSE = {
  id: 10,
  label: 'Universo Alpha',
  universeTypeCode: 'FMS',
  activeSuperclusters: 5,
  activeClusters: 1,
};

const setup = (
  overrides: Partial<{ onClose: () => void; onRenamed: (id: number, label: string) => void }> = {}
): { onClose: ReturnType<typeof vi.fn>; onRenamed: ReturnType<typeof vi.fn> } => {
  const onClose = vi.fn();
  const onRenamed = vi.fn();
  render(
    <RenameUniverseModal
      universe={UNIVERSE}
      onClose={overrides.onClose ?? onClose}
      onRenamed={overrides.onRenamed ?? onRenamed}
    />
  );
  return { onClose, onRenamed };
};

const type = (value: string): void => {
  fireEvent.change(screen.getByTestId('rename-universe-input'), { target: { value } });
};

describe('FC192 — RenameUniverseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('universe null ⇒ no monta nada', () => {
    render(<RenameUniverseModal universe={null} onClose={vi.fn()} onRenamed={vi.fn()} />);
    expect(screen.queryByTestId('rename-universe-form')).toBeNull();
  });

  it('abre con el nombre actual, el contador y el botón Guardar deshabilitado (sin cambios), sin mensaje', () => {
    setup();

    expect(screen.getByTestId('rename-universe-input')).toHaveValue('Universo Alpha');
    expect(screen.getByTestId('rename-universe-counter')).toHaveTextContent('14/100');
    expect(screen.getByTestId('rename-universe-submit')).toBeDisabled();
    expect(screen.queryByTestId('rename-universe-error')).toBeNull();
  });

  it('validación en vivo: 2 caracteres ⇒ "Mínimo 3" y Guardar deshabilitado; 101 ⇒ "Máximo 100"', () => {
    setup();

    type('ab');
    expect(screen.getByTestId('rename-universe-error')).toHaveTextContent('Mínimo 3 caracteres');
    expect(screen.getByTestId('rename-universe-submit')).toBeDisabled();

    type('a'.repeat(101));
    expect(screen.getByTestId('rename-universe-error')).toHaveTextContent('Máximo 100 caracteres');
    expect(screen.getByTestId('rename-universe-counter')).toHaveTextContent('101/100');
  });

  it('el contador cuenta el nombre NORMALIZADO (espacios de más no suman)', () => {
    setup();

    type('  Universo    Beta  ');

    expect(screen.getByTestId('rename-universe-counter')).toHaveTextContent('13/100');
  });

  it('un valor que tras normalizar queda igual al actual ⇒ "Sin cambios" y no se puede guardar', () => {
    setup();

    type('Universo Alpha  ');

    expect(screen.getByTestId('rename-universe-error')).toHaveTextContent('Sin cambios');
    expect(screen.getByTestId('rename-universe-submit')).toBeDisabled();
  });

  it('Scenario 1 — envía PATCH con el nombre NORMALIZADO y avisa al padre con el nombre guardado', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { success: true, universe: { id: 10, code: 'UNIV_ALPHA', label: 'Universo Beta' } },
    });
    const { onRenamed } = setup();

    type('  Universo    Beta ');
    fireEvent.click(screen.getByTestId('rename-universe-submit'));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith(10, 'Universo Beta'));
    expect(api.patch).toHaveBeenCalledWith('/cosmology/universes/10/label', {
      label: 'Universo Beta',
    });
  });

  it('mientras guarda: botón "Guardando…" deshabilitado', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    vi.mocked(api.patch).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never
    );
    setup();

    type('Universo Beta');
    fireEvent.click(screen.getByTestId('rename-universe-submit'));

    expect(await screen.findByText('Guardando…')).toBeInTheDocument();
    expect(screen.getByTestId('rename-universe-submit')).toBeDisabled();
    resolve({ data: { success: true, universe: { label: 'Universo Beta' } } });
    await waitFor(() => expect(screen.queryByText('Guardando…')).toBeNull());
  });

  it('Scenario 2 — 409 UNIVERSE_NAME_ALREADY_EXISTS ⇒ mensaje claro, el modal sigue abierto y NO se notifica al padre', async () => {
    vi.mocked(api.patch).mockRejectedValue({
      response: { data: { code: 'UNIVERSE_NAME_ALREADY_EXISTS' } },
    });
    const { onRenamed, onClose } = setup();

    type('Flota Central');
    fireEvent.click(screen.getByTestId('rename-universe-submit'));

    expect(await screen.findByText('Ya existe un universo con este nombre')).toBeInTheDocument();
    expect(onRenamed).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('rename-universe-submit')).toBeEnabled();
  });

  it('el error del servidor se limpia al volver a escribir', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Network Error'));
    setup();

    type('Universo Beta');
    fireEvent.click(screen.getByTestId('rename-universe-submit'));
    await screen.findByText('No se pudo renombrar el Universo. Intenta de nuevo.');
    type('Universo Gamma');

    expect(screen.queryByText('No se pudo renombrar el Universo. Intenta de nuevo.')).toBeNull();
  });

  it('Enter en el formulario (submit) guarda igual que el botón; inválido no envía nada', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { success: true, universe: { label: 'Universo Beta' } },
    });
    const { onRenamed } = setup();

    type('ab');
    fireEvent.submit(screen.getByTestId('rename-universe-form'));
    expect(api.patch).not.toHaveBeenCalled();

    type('Universo Beta');
    fireEvent.submit(screen.getByTestId('rename-universe-form'));
    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith(10, 'Universo Beta'));
  });

  it('Cancelar cierra sin enviar nada', () => {
    const { onClose } = setup();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();
  });
});
