import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import RolesManager from './RolesManager';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockRoles = [
  { id: 0, name: 'Master (Archon)', description: 'Global system controller' },
  { id: 1, name: 'Director de Flotilla', description: 'Fleet manager' },
  { id: 2, name: 'Supervisor', description: 'Ops lead' },
];

describe('RolesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: mockRoles } });
  });

  it('renders roles table after loading', async () => {
    render(<RolesManager />);
    await waitFor(() => expect(screen.getByTestId('roles-table')).toBeInTheDocument());
    expect(screen.getByText('Master (Archon)')).toBeInTheDocument();
    expect(screen.getByText('Director de Flotilla')).toBeInTheDocument();
  });

  it('shows Archon badge for role id=0 — no edit/delete buttons', async () => {
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    expect(screen.getByText('Archon')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-role-0')).toBeNull();
    expect(screen.queryByTestId('delete-role-0')).toBeNull();
  });

  it('shows edit and delete buttons for non-protected roles', async () => {
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    expect(screen.getByTestId('edit-role-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-role-1')).toBeInTheDocument();
  });

  it('opens inline edit form on edit click', async () => {
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    fireEvent.click(screen.getByTestId('edit-role-1'));
    expect(screen.getByTestId('edit-name-input')).toBeInTheDocument();
  });

  it('saves edit via PATCH and updates UI', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } });
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    fireEvent.click(screen.getByTestId('edit-role-1'));
    const input = screen.getByTestId('edit-name-input');
    fireEvent.change(input, { target: { value: 'Director Actualizado' } });
    fireEvent.click(screen.getByTestId('save-edit-btn'));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/admin/roles/1',
        expect.objectContaining({ name: 'Director Actualizado' })
      )
    );
    await waitFor(() => expect(screen.getByText('Director Actualizado')).toBeInTheDocument());
  });

  it('opens add row on "Nuevo Rol" click', async () => {
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    fireEvent.click(screen.getByTestId('add-role-btn'));
    expect(screen.getByTestId('new-name-input')).toBeInTheDocument();
  });

  it('creates new role via POST and appends to list', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { id: 99, name: 'Nuevo Rol', description: '' } },
    });
    render(<RolesManager />);
    await waitFor(() => screen.getByTestId('roles-table'));
    fireEvent.click(screen.getByTestId('add-role-btn'));
    fireEvent.change(screen.getByTestId('new-name-input'), { target: { value: 'Nuevo Rol' } });
    fireEvent.click(screen.getByTestId('confirm-add-btn'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/admin/roles',
        expect.objectContaining({ name: 'Nuevo Rol' })
      )
    );
    await waitFor(() => expect(screen.getAllByText('Nuevo Rol').length).toBeGreaterThan(0));
  });

  it('shows error message on API failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    render(<RolesManager />);
    await waitFor(() =>
      expect(screen.getByText(/No se pudo cargar la lista de roles/i)).toBeInTheDocument()
    );
  });
});
