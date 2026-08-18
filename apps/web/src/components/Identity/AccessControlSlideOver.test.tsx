import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import AccessControlSlideOver from './AccessControlSlideOver';

/**
 * FC162 F2 — AccessControlSlideOver.tsx had zero test coverage. It's not a
 * dead component — `ArchonCenter.tsx` mounts it live, controlled by
 * `isAccessControlOpen` state — but its "Registrar Personal" tab calls
 * `POST /v1/auth/register`, retired with 404 since FC082 F0c (confirmed:
 * `apps/api/src/routes/auth.test.ts` "POST /v1/auth/register — purgado").
 *
 * **Hallazgo real, no corregido en silencio (per FC162 "Qué NO hace"):** el
 * panel "Registrar Personal" de este componente está roto en PROD hoy — el
 * submit siempre falla contra un endpoint que ya no existe. Este archivo
 * documenta el comportamiento REAL actual (el usuario ve un error, el
 * registro nunca ocurre), no lo arregla — fuera de alcance de una campaña de
 * cobertura (ver `Cond.R-162` y el propio texto del FC). Reportado a
 * Alfa/Bravo vía H para que decidan si abre un FC de reparación aparte,
 * mismo patrón que el hallazgo de `UniversesDirectory.tsx` en FC161.
 *
 * Uses raw `fetch()` (not the `api` client) and reads the token directly
 * from `localStorage` — pre-dates the httpOnly-cookie auth flow the rest of
 * the app uses today (see `App.tsx`'s own header comment). Not touched here.
 */

const USERS = [
  { id: 1, username: 'jefe.mina', email: 'jefe@piic.com', roleId: 3 },
  { id: 2, username: 'master', email: 'admin@piic.com', roleId: 0 },
];

function mockFetchOnce(status: number, body: unknown): void {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  localStorage.setItem('archon_token', 'test-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AccessControlSlideOver', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AccessControlSlideOver isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('fetches personnel on open and renders the roster with role badges', async () => {
    mockFetchOnce(200, { success: true, data: USERS });
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/users'),
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
      )
    );
    expect(await screen.findByText('jefe.mina')).toBeInTheDocument();
    expect(screen.getByText('JEFE DE MANTENIMIENTO DE MINA')).toBeInTheDocument();
    expect(screen.getByText('MASTER (ARCHON)')).toBeInTheDocument();
  });

  it('shows the empty-roster message when the fetch returns no users', async () => {
    mockFetchOnce(200, { success: true, data: [] });
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    expect(await screen.findByText('Sin personal registrado.')).toBeInTheDocument();
  });

  it('renders the fallback role badge for an unrecognized roleId', async () => {
    mockFetchOnce(200, {
      success: true,
      data: [{ id: 9, username: 'ghost', email: 'x@x.mx', roleId: 99 }],
    });
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    expect(await screen.findByText('DESCONOCIDO')).toBeInTheDocument();
  });

  it('switching to "Registrar Personal" shows the registration form', async () => {
    mockFetchOnce(200, { success: true, data: [] });
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Registrar Personal'));
    expect(screen.getByPlaceholderText('Ej. juan.perez')).toBeInTheDocument();
  });

  it('HALLAZGO REAL: submitting the registration form fails today — POST /v1/auth/register is retired (404)', async () => {
    mockFetchOnce(200, { success: true, data: [] }); // initial roster load
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Registrar Personal'));
    fireEvent.change(screen.getByPlaceholderText('Ej. juan.perez'), {
      target: { value: 'nuevo.usuario' },
    });
    fireEvent.change(screen.getByPlaceholderText('email@piic.com.mx'), {
      target: { value: 'nuevo@piic.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Archon@1234!' },
    });

    // Matches Fastify's real default 404 body shape for a route that no
    // longer exists (confirmed against apps/api/src/routes/auth.test.ts).
    mockFetchOnce(404, {
      statusCode: 404,
      error: 'Not Found',
      message: 'Route POST:/v1/auth/register not found',
    });
    fireEvent.click(screen.getByText('Guardar Identidad'));

    expect(await screen.findByText('Not Found')).toBeInTheDocument();
    // The roster was never refreshed after the failed submit — no 3rd fetch call.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when the backdrop or the X button is clicked', async () => {
    mockFetchOnce(200, { success: true, data: [] });
    const onClose = vi.fn();
    const { container } = render(<AccessControlSlideOver isOpen onClose={onClose} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.click(container.querySelector('.absolute.inset-0') as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('silently keeps loading=false and an empty roster when the fetch itself throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    render(<AccessControlSlideOver isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(await screen.findByText('Sin personal registrado.')).toBeInTheDocument();
  });
});
