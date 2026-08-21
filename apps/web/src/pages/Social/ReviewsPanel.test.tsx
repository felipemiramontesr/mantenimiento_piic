/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import ReviewsPanel from './ReviewsPanel';
import api from '../../api/client';

/**
 * FC-9 SocialNetwork_Multiverso FaseC — ReviewsPanel
 *
 * AT-SOC9-C-WEB-1: renderiza reviews-panel container y review-form
 * AT-SOC9-C-WEB-2: muestra review-card cuando la API retorna reseñas
 * AT-SOC9-C-WEB-3: muestra reviews-empty cuando lista vacía
 * AT-SOC9-C-WEB-4: muestra reviews-error cuando la API falla
 */

vi.mock('../../api/client');
const mockGet = vi.mocked(api.get);

const MOCK_REVIEWS = [
  {
    id: 1,
    reviewerId: 2,
    tallerOwnerId: 3,
    rating: 5,
    bodyText: 'Servicio de primera.',
    workOrderId: 10,
    linkId: null,
    verified: true,
    createdAt: '2026-06-20T10:00:00Z',
  },
];

describe('ReviewsPanel — FC-9 SocialNetwork FaseC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-SOC9-C-WEB-1: renderiza container y review-form', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } });
    render(<ReviewsPanel tallerOwnerId={3} />);
    expect(screen.getByTestId('reviews-panel')).toBeInTheDocument();
    expect(screen.getByTestId('review-form')).toBeInTheDocument();
  });

  it('AT-SOC9-C-WEB-2: muestra review-card cuando API retorna reseñas', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: MOCK_REVIEWS, avgRating: 5 } });
    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => {
      expect(screen.getByTestId('review-card-1')).toBeInTheDocument();
    });
    expect(screen.getByText('Servicio de primera.')).toBeInTheDocument();
  });

  it('AT-SOC9-C-WEB-3: muestra reviews-empty cuando lista vacía', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } });
    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => {
      expect(screen.getByTestId('reviews-empty')).toBeInTheDocument();
    });
  });

  it('AT-SOC9-C-WEB-4: muestra reviews-error cuando la API falla', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => {
      expect(screen.getByTestId('reviews-error')).toBeInTheDocument();
    });
  });

  // ── R4-C Fc162 — Sonar unc lines 38-41,45,47,48,51,52,55,58,140,154,169,179 ──
  // NOTA: el AuthProvider REAL (envuelto por testUtils) dispara su propio
  // api.post('/auth/refresh') al montar, consumiendo cualquier
  // mockResolvedValueOnce/mockRejectedValueOnce encolado antes de que el
  // formulario llegue a enviarse (mismo hallazgo que ProfileView.tsx/
  // ArchonProfilePanel.tsx en esta ronda) — se rama por URL en su lugar.
  it('AT-SOC9-C-WEB-5: envío exitoso postea el payload correcto y limpia el formulario', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } });
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } }); // refetch post-submit
    const mockPost = vi.mocked(api.post);
    mockPost.mockImplementation((url: string) => {
      if (url === '/social/reviews') return Promise.resolve({ data: { success: true } });
      return Promise.resolve({ data: { success: false } });
    });

    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => expect(screen.getByTestId('reviews-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('rating-star-4'));
    fireEvent.change(screen.getByTestId('review-body-input'), {
      target: { value: 'Excelente atención.' },
    });
    fireEvent.change(screen.getByTestId('review-work-order-input'), { target: { value: '42' } });

    fireEvent.submit(screen.getByTestId('review-form'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/social/reviews', {
        tallerOwnerId: 3,
        rating: 4,
        bodyText: 'Excelente atención.',
        workOrderId: 42,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('review-body-input')).toHaveValue('');
    });
    expect(screen.getByTestId('review-work-order-input')).toHaveValue(null);
  });

  it('AT-SOC9-C-WEB-6: muestra el mensaje específico cuando el backend responde NO_VERIFIED_LINK', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockImplementation((url: string) => {
      if (url === '/social/reviews') {
        return Promise.reject({ response: { data: { error: 'NO_VERIFIED_LINK' } } });
      }
      return Promise.resolve({ data: { success: false } });
    });

    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => expect(screen.getByTestId('reviews-empty')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('review-body-input'), { target: { value: 'Buen taller' } });
    fireEvent.submit(screen.getByTestId('review-form'));

    await waitFor(() => {
      expect(screen.getByTestId('review-submit-error')).toHaveTextContent(
        'No tienes una OT cerrada o enlace verificado con este taller.'
      );
    });
  });

  it('AT-SOC9-C-WEB-7: muestra el mensaje específico cuando el backend responde REVIEW_ALREADY_EXISTS', async () => {
    mockGet.mockResolvedValueOnce({ data: { reviews: [], avgRating: null } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockImplementation((url: string) => {
      if (url === '/social/reviews') {
        return Promise.reject({ response: { data: { error: 'REVIEW_ALREADY_EXISTS' } } });
      }
      return Promise.resolve({ data: { success: false } });
    });

    render(<ReviewsPanel tallerOwnerId={3} />);
    await waitFor(() => expect(screen.getByTestId('reviews-empty')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('review-body-input'), { target: { value: 'Buen taller' } });
    fireEvent.submit(screen.getByTestId('review-form'));

    await waitFor(() => {
      expect(screen.getByTestId('review-submit-error')).toHaveTextContent(
        'Ya enviaste una reseña para este taller.'
      );
    });
  });
});
