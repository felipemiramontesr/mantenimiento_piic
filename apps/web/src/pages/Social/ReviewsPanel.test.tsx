/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
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
});
