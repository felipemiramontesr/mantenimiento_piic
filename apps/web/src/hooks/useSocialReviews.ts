import { useState, useCallback } from 'react';
import api from '../api/client';

export interface SocialReview {
  id: number;
  reviewerId: number;
  tallerOwnerId: number;
  rating: number;
  bodyText: string;
  workOrderId: number | null;
  linkId: number | null;
  verified: boolean;
  createdAt: string;
}

interface SubmitReviewPayload {
  tallerOwnerId: number;
  rating: number;
  bodyText: string;
  workOrderId?: number;
  linkId?: number;
}

interface UseSocialReviewsReturn {
  reviews: SocialReview[];
  avgRating: number | null;
  isLoading: boolean;
  error: string | null;
  fetchReviews: (tallerId?: number) => Promise<void>;
  submitReview: (payload: SubmitReviewPayload) => Promise<void>;
}

export function useSocialReviews(): UseSocialReviewsReturn {
  const [reviews, setReviews] = useState<SocialReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (tallerId?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const url = tallerId ? `/social/reviews?tallerId=${tallerId}` : '/social/reviews';
      const res = await api.get<{ reviews: SocialReview[]; avgRating: number | null }>(url);
      setReviews(res.data.reviews);
      setAvgRating(res.data.avgRating);
    } catch {
      setError('Error al cargar reseñas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitReview = useCallback(
    async (payload: SubmitReviewPayload): Promise<void> => {
      await api.post('/social/reviews', payload);
      await fetchReviews(payload.tallerOwnerId);
    },
    [fetchReviews]
  );

  return { reviews, avgRating, isLoading, error, fetchReviews, submitReview };
}
