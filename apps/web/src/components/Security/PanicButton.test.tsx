import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import PanicButton from './PanicButton';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(api.post);

// AuthProvider calls api.post('/auth/refresh') on mount — we must handle that call
// to not consume the panic mock value.
const authRefreshFail = { data: { success: false } };

describe('FC-4 Panic_Button FaseB — PanicButton component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: auth/refresh fails silently; specific tests override for /security/panic
    mockPost.mockResolvedValue(authRefreshFail);
  });

  it('AT-PB-1: renders floating SOS button', () => {
    render(<PanicButton />);
    expect(screen.getByTestId('panic-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/botón de pánico/i)).toBeInTheDocument();
  });

  it('AT-PB-2: button is initially enabled (idle state)', () => {
    render(<PanicButton />);
    expect(screen.getByTestId('panic-button')).not.toBeDisabled();
  });

  it('AT-PB-3: shows SOS sent banner with notified count after successful panic', async () => {
    mockPost.mockImplementation((url: string) => {
      if ((url as string) === '/auth/refresh') return Promise.resolve(authRefreshFail);
      return Promise.resolve({ data: { success: true, panicUuid: 'uuid-001', notifiedCount: 3 } });
    });

    render(<PanicButton />);
    fireEvent.click(screen.getByTestId('panic-button'));

    await waitFor(() => {
      expect(screen.getByTestId('panic-banner')).toBeInTheDocument();
      expect(screen.getByText(/SOS enviado/i)).toBeInTheDocument();
      expect(screen.getByText(/3 contactos/i)).toBeInTheDocument();
    });
  });

  it('AT-PB-4: shows error banner when API call fails', async () => {
    mockPost.mockImplementation((url: string) => {
      if ((url as string) === '/auth/refresh') return Promise.resolve(authRefreshFail);
      return Promise.reject(new Error('Network error'));
    });

    render(<PanicButton />);
    fireEvent.click(screen.getByTestId('panic-button'));

    await waitFor(() => {
      expect(screen.getByTestId('panic-banner')).toBeInTheDocument();
      expect(screen.getByText(/Error al enviar SOS/i)).toBeInTheDocument();
    });
  });

  it('AT-PB-5: dismiss button hides banner', async () => {
    mockPost.mockImplementation((url: string) => {
      if ((url as string) === '/auth/refresh') return Promise.resolve(authRefreshFail);
      return Promise.resolve({ data: { success: true, panicUuid: 'uuid-002', notifiedCount: 1 } });
    });

    render(<PanicButton />);
    fireEvent.click(screen.getByTestId('panic-button'));

    await waitFor(() => {
      expect(screen.getByTestId('panic-banner')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('panic-banner-dismiss'));

    await waitFor(() => {
      expect(screen.queryByTestId('panic-banner')).not.toBeInTheDocument();
    });
  });

  it('AT-PB-6: calls POST /security/panic', async () => {
    mockPost.mockImplementation((url: string) => {
      if ((url as string) === '/auth/refresh') return Promise.resolve(authRefreshFail);
      return Promise.resolve({ data: { success: true, panicUuid: 'uuid-003', notifiedCount: 2 } });
    });

    render(<PanicButton />);
    fireEvent.click(screen.getByTestId('panic-button'));

    await waitFor(() => {
      const panicCall = mockPost.mock.calls.find((c) => c[0] === '/security/panic');
      expect(panicCall).toBeDefined();
      expect(panicCall?.[1]).toEqual({});
    });
  });
});
