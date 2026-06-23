import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import ContactsDirectory from './ContactsDirectory';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const MOCK_CONTACTS = [
  {
    id: 1,
    ownerId: 5,
    fullName: 'Maria García',
    company: 'PIIC SA',
    roleLabel: 'Gerente',
    email: 'maria@piic.mx',
    phone: '5512345678',
    notes: null,
    isActive: true,
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
  },
  {
    id: 2,
    ownerId: 5,
    fullName: 'Luis Morales',
    company: null,
    roleLabel: null,
    email: 'luis@piic.mx',
    phone: null,
    notes: 'Contacto secundario',
    isActive: false,
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
  },
];

const mockGet = vi.mocked(api.get);

describe('FC-5 CRM FaseC — ContactsDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Auth refresh mock
    vi.mocked(api.post).mockResolvedValue({ data: { success: false } });
  });

  it('AT-CRM-C-1: renders directory container', async () => {
    mockGet.mockResolvedValueOnce({ data: { contacts: [] } });
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('contacts-directory')).toBeInTheDocument();
    });
  });

  it('AT-CRM-C-2: renders contact cards from API', async () => {
    mockGet.mockResolvedValueOnce({ data: { contacts: MOCK_CONTACTS } });
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('contacts-grid')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('contact-card')).toHaveLength(2);
    expect(screen.getByText('Maria García')).toBeInTheDocument();
    expect(screen.getByText('Luis Morales')).toBeInTheDocument();
  });

  it('AT-CRM-C-3: shows decrypted email and phone', async () => {
    mockGet.mockResolvedValueOnce({ data: { contacts: MOCK_CONTACTS } });
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByText('maria@piic.mx')).toBeInTheDocument();
    });
    expect(screen.getByText('5512345678')).toBeInTheDocument();
  });

  it('AT-CRM-C-4: shows empty state when no contacts', async () => {
    mockGet.mockResolvedValueOnce({ data: { contacts: [] } });
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByText(/No hay contactos registrados/i)).toBeInTheDocument();
    });
  });

  it('AT-CRM-C-5: search filters contacts by name', async () => {
    mockGet.mockResolvedValueOnce({ data: { contacts: MOCK_CONTACTS } });
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('contacts-grid')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('contacts-search'), { target: { value: 'maria' } });
    await waitFor(() => {
      expect(screen.getAllByTestId('contact-card')).toHaveLength(1);
      expect(screen.getByText('Maria García')).toBeInTheDocument();
      expect(screen.queryByText('Luis Morales')).not.toBeInTheDocument();
    });
  });

  it('AT-CRM-C-6: shows error state on API failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByTestId('contacts-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/No se pudo cargar/i)).toBeInTheDocument();
  });

  it('AT-CRM-C-7: refresh button triggers re-fetch', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { contacts: [] } })
      .mockResolvedValueOnce({ data: { contacts: MOCK_CONTACTS } });

    render(<ContactsDirectory />);
    await waitFor(() => {
      expect(screen.getByText(/No hay contactos/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Recargar directorio/i));

    await waitFor(() => {
      expect(screen.getAllByTestId('contact-card')).toHaveLength(2);
    });
  });
});
