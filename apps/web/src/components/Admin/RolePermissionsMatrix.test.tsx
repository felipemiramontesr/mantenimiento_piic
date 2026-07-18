import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import RolePermissionsMatrix from './RolePermissionsMatrix';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

/**
 * FC 078 F3 — tests de la migración a ArchonDataTable (la matriz no tenía
 * suite propia). Cubre: render con data real, toggle de checkbox, guardado
 * por rol vía PUT y el contrato responsive de la primitiva.
 */

const mockMatrix = {
  roles: [
    { id: 1, name: 'Director', permissions: ['fleet:view'] },
    { id: 2, name: 'Supervisor', permissions: [] },
  ],
  allPermissions: [
    { id: 10, slug: 'fleet:view' },
    { id: 11, slug: 'fleet:write' },
  ],
};

describe('RolePermissionsMatrix (FC 078 F3 — migración a primitiva)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: mockMatrix } });
  });

  it('renders the matrix with role columns and permission rows', async () => {
    render(<RolePermissionsMatrix />);
    await waitFor(() => screen.getByTestId('role-permissions-matrix'));
    expect(screen.getByText('Director')).toBeInTheDocument();
    expect(screen.getByText('Supervisor')).toBeInTheDocument();
    expect(screen.getByText('Ver Flota')).toBeInTheDocument();
    expect(screen.getByText('Editar Flota')).toBeInTheDocument();
  });

  it('renders the save row (ex-tfoot) as the last body row', async () => {
    render(<RolePermissionsMatrix />);
    await waitFor(() => screen.getByTestId('role-permissions-matrix'));
    expect(screen.getByText('Guardar por rol')).toBeInTheDocument();
    expect(screen.getAllByText('Guardar')).toHaveLength(2);
  });

  it('toggles a permission checkbox and saves via PUT', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
    render(<RolePermissionsMatrix />);
    await waitFor(() => screen.getByTestId('role-permissions-matrix'));
    const checkboxes = screen.getAllByRole('checkbox');
    // fila fleet:view: [Director(checked), Supervisor(unchecked)]
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(checkboxes[1]);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getAllByText('Guardar')[1]);
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/admin/roles/2/permissions', {
        permissions: ['fleet:view'],
      })
    );
  });

  it('shows error state when the API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('boom'));
    render(<RolePermissionsMatrix />);
    await waitFor(() =>
      expect(screen.getByText(/No se pudo cargar la matriz de permisos/i)).toBeInTheDocument()
    );
  });

  // ── contrato responsive de la primitiva ──
  it('AT-FC078-F3-RPM-1: la tabla vive en SovereignScrollArea con minWidth = 192 + roles×110', async () => {
    render(<RolePermissionsMatrix />);
    await waitFor(() => screen.getByTestId('role-permissions-matrix'));
    expect(screen.getByTestId('role-permissions-matrix-scroll-viewport').className).toContain(
      'overflow-x-auto'
    );
    expect(screen.getByTestId('role-permissions-matrix').style.minWidth).toBe(`${192 + 2 * 110}px`);
  });
});
