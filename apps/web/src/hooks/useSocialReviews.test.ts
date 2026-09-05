import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useSocialReviews } from './useSocialReviews';

/**
 * FC165 F2 Slice 2.3B — useSocialReviews.ts had no dedicated test file.
 */

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const REVIEW_FIXTURE = {
  id: 1,
  reviewerId: 2,
  tallerOwnerId: 5,
  rating: 5,
  bodyText: 'Excelente servicio',
  workOrderId: null,
  linkId: null,
  verified: true,
  createdAt: '2026-08-01T00:00:00.000Z',
};

describe('useSocialReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchReviews scopes the request to a specific tallerId when provided', async () => {
    (api.get as Mock).mockResolvedValue({ data: { reviews: [REVIEW_FIXTURE], avgRating: 5 } });

    const { result } = renderHook(() => useSocialReviews());

    await act(async () => {
      await result.current.fetchReviews(5);
    });

    expect(api.get).toHaveBeenCalledWith('/social/reviews?tallerId=5');
    expect(result.current.reviews).toEqual([REVIEW_FIXTURE]);
    expect(result.current.avgRating).toBe(5);
  });

  // ── R4-C Fc165 F2 Slice 2.3B — unc line 43 ──

  it('fetchReviews requests the unscoped endpoint when tallerId is omitted', async () => {
    (api.get as Mock).mockResolvedValue({ data: { reviews: [], avgRating: null } });

    const { result } = renderHook(() => useSocialReviews());

    await act(async () => {
      await result.current.fetchReviews();
    });

    expect(api.get).toHaveBeenCalledWith('/social/reviews');
  });

  it('sets an error and stops loading when the fetch fails', async () => {
    (api.get as Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useSocialReviews());

    await act(async () => {
      await result.current.fetchReviews(5);
    });

    expect(result.current.error).toBe('Error al cargar reseñas');
    expect(result.current.isLoading).toBe(false);
  });

  it('submitReview posts the payload and refetches reviews for that owner', async () => {
    (api.post as Mock).mockResolvedValue({ data: {} });
    (api.get as Mock).mockResolvedValue({ data: { reviews: [REVIEW_FIXTURE], avgRating: 5 } });

    const { result } = renderHook(() => useSocialReviews());

    await act(async () => {
      await result.current.submitReview({
        tallerOwnerId: 5,
        rating: 5,
        bodyText: 'Excelente servicio',
      });
    });

    expect(api.post).toHaveBeenCalledWith('/social/reviews', {
      tallerOwnerId: 5,
      rating: 5,
      bodyText: 'Excelente servicio',
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/social/reviews?tallerId=5'));
  });
});
