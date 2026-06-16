import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AreasPanel from './AreasPanel';

/**
 * 🔱 Archon Test: AreasPanel (Archon Master F2-H)
 * CRUD areas for a FLOTILLA owner — fetches ownerId, lists, creates, edits, deactivates.
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const mockApiGet = vi.hoisted(() => vi.fn());
const mockApiPost = vi.hoisted(() => vi.fn());
const mockApiPut = vi.hoisted(() => vi.fn());
const mockApiDelete = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  default: {
    get: mockApiGet,
    post: mockApiPost,
    put: mockApiPut,
    delete: mockApiDelete,
  },
}));

const OWNER_ID = 100;
const USER_ID = 42;

interface AreaFixture {
  id: number;
  owner_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

const makeArea = (id: number, name: string, isActive = true): AreaFixture => ({
  id,
  owner_id: OWNER_ID,
  name,
  is_active: isActive,
  created_at: '2026-01-01T00:00:00.000Z',
});

const setupAuthMock = (): void => {
  mockUseAuth.mockReturnValue({ currentUser: { id: USER_ID } });
};

const setupOwnerAndAreas = (areas: ReturnType<typeof makeArea>[]): void => {
  mockApiGet.mockImplementation((url: string) => {
    if (url.includes(`/owners/${OWNER_ID}/areas`)) {
      return Promise.resolve({ data: { success: true, data: areas } });
    }
    if (url.includes('/owners')) {
      return Promise.resolve({
        data: { success: true, data: [{ ownerId: OWNER_ID, label: 'Test Flotilla' }] },
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
};

describe('AreasPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock();
  });

  it('shows loading spinner initially', () => {
    setupOwnerAndAreas([]);
    render(<AreasPanel />);
    expect(screen.getByTestId('areas-loading')).toBeInTheDocument();
  });

  it('shows empty state when no areas returned', async () => {
    setupOwnerAndAreas([]);
    render(<AreasPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('areas-empty')).toBeInTheDocument();
    });
  });

  it('renders list of active areas', async () => {
    setupOwnerAndAreas([makeArea(1, 'Mantenimiento'), makeArea(2, 'Finanzas')]);
    render(<AreasPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('area-name-1')).toHaveTextContent('Mantenimiento');
      expect(screen.getByTestId('area-name-2')).toHaveTextContent('Finanzas');
    });
  });

  it('shows inactive label for inactive areas', async () => {
    setupOwnerAndAreas([makeArea(3, 'RRHH', false)]);
    render(<AreasPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('area-inactive-3')).toBeInTheDocument();
    });
  });

  it('creates a new area and appends it to the list', async () => {
    const newArea = makeArea(10, 'Logística');
    setupOwnerAndAreas([makeArea(1, 'Mantenimiento')]);
    mockApiPost.mockResolvedValueOnce({ data: { success: true, data: newArea } });

    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('area-name-1')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('new-area-input'), { target: { value: 'Logística' } });
    fireEvent.click(screen.getByTestId('create-area-btn'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(`/owners/${OWNER_ID}/areas`, { name: 'Logística' });
      expect(screen.getByTestId('area-name-10')).toHaveTextContent('Logística');
    });
  });

  it('clears input after successful create', async () => {
    setupOwnerAndAreas([]);
    mockApiPost.mockResolvedValueOnce({
      data: { success: true, data: makeArea(5, 'Operaciones') },
    });

    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('areas-empty')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('new-area-input'), { target: { value: 'Operaciones' } });
    fireEvent.click(screen.getByTestId('create-area-btn'));

    await waitFor(() => {
      expect((screen.getByTestId('new-area-input') as HTMLInputElement).value).toBe('');
    });
  });

  it('enters edit mode and saves updated name', async () => {
    setupOwnerAndAreas([makeArea(1, 'Mantenimiento')]);
    mockApiPut.mockResolvedValueOnce({ data: { success: true } });

    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('area-name-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-btn-1'));
    const editInput = screen.getByTestId('edit-input-1') as HTMLInputElement;
    expect(editInput.value).toBe('Mantenimiento');

    fireEvent.change(editInput, { target: { value: 'Mantenimiento Actualizado' } });
    fireEvent.click(screen.getByTestId('save-edit-1'));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(`/owners/${OWNER_ID}/areas/1`, {
        name: 'Mantenimiento Actualizado',
      });
      expect(screen.getByTestId('area-name-1')).toHaveTextContent('Mantenimiento Actualizado');
    });
  });

  it('deactivates an area via delete button', async () => {
    setupOwnerAndAreas([makeArea(1, 'Finanzas')]);
    mockApiDelete.mockResolvedValueOnce({ data: { success: true } });

    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('deactivate-btn-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('deactivate-btn-1'));

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith(`/owners/${OWNER_ID}/areas/1`);
      expect(screen.getByTestId('area-inactive-1')).toBeInTheDocument();
    });
  });

  it('shows error when owner fetch fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));
    render(<AreasPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('areas-error')).toHaveTextContent('Error al cargar las áreas');
    });
  });

  it('shows error when no owner associated', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { success: true, data: [] } });
    render(<AreasPanel />);
    await waitFor(() => {
      expect(screen.getByTestId('areas-error')).toBeInTheDocument();
    });
  });

  it('shows error when create fails', async () => {
    setupOwnerAndAreas([]);
    mockApiPost.mockRejectedValueOnce(new Error('Server error'));

    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('areas-empty')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('new-area-input'), { target: { value: 'Compras' } });
    fireEvent.click(screen.getByTestId('create-area-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('areas-error')).toHaveTextContent('Error al crear el área');
    });
  });

  it('create button is disabled when input is empty', async () => {
    setupOwnerAndAreas([]);
    render(<AreasPanel />);
    await waitFor(() => expect(screen.getByTestId('areas-empty')).toBeInTheDocument());
    expect(screen.getByTestId('create-area-btn')).toBeDisabled();
  });
});
