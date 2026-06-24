import React, { useEffect, useState } from 'react';
import { Star, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { useSocialReviews } from '../../hooks/useSocialReviews';
import AT from '../../styles/archonTypography';

interface ReviewsPanelProps {
  tallerOwnerId: number;
}

function StarRating({ value }: { value: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ tallerOwnerId }) => {
  const { reviews, avgRating, isLoading, error, fetchReviews, submitReview } = useSocialReviews();

  const [rating, setRating] = useState(5);
  const [bodyText, setBodyText] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews(tallerOwnerId).catch(() => undefined);
  }, [tallerOwnerId, fetchReviews]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await submitReview({
        tallerOwnerId,
        rating,
        bodyText: bodyText.trim(),
        workOrderId: workOrderId ? Number(workOrderId) : undefined,
      });
      setBodyText('');
      setWorkOrderId('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Error'
          : 'Error';
      const userMsg =
        msg === 'NO_VERIFIED_LINK'
          ? 'No tienes una OT cerrada o enlace verificado con este taller.'
          : 'Ya enviaste una reseña para este taller.';
      setSubmitError(msg === 'NO_VERIFIED_LINK' || msg === 'REVIEW_ALREADY_EXISTS' ? userMsg : msg);
    }
  };

  return (
    <div data-testid="reviews-panel" className="flex flex-col gap-5">
      {/* Header + avg */}
      <div className="flex items-center justify-between">
        <span className={AT.sectionTitle}>Reseñas</span>
        {avgRating !== null && avgRating > 0 && (
          <div data-testid="reviews-avg" className="flex items-center gap-1.5">
            <StarRating value={Math.round(avgRating)} />
            <span className="text-archon-xs font-black text-amber-500 uppercase tracking-widest">
              {avgRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div data-testid="reviews-loading" className="flex justify-center py-6">
          <div className="w-4 h-4 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          data-testid="reviews-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Reviews list */}
      {!isLoading && !error && (
        <div data-testid="reviews-list" className="flex flex-col gap-3">
          {reviews.length === 0 && (
            <p
              data-testid="reviews-empty"
              className="text-archon-xs text-slate-400 uppercase tracking-widest text-center py-4"
            >
              Sin reseñas aún
            </p>
          )}
          {reviews.map((review) => (
            <div
              key={review.id}
              data-testid={`review-card-${review.id}`}
              className="flex flex-col gap-1.5 p-3 bg-white border border-[#0f2a44]/10 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <StarRating value={review.rating} />
                {review.verified && (
                  <div className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-archon-xs font-black uppercase tracking-widest">
                      Verificada
                    </span>
                  </div>
                )}
              </div>
              <p className="text-archon-sm text-[#0f2a44]/80">{review.bodyText}</p>
              <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
                {new Date(review.createdAt).toLocaleDateString('es-MX', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Submit form */}
      <form
        data-testid="review-form"
        onSubmit={(e): void => {
          handleSubmit(e).catch(() => undefined);
        }}
        className="flex flex-col gap-3 p-4 bg-[#0a1929]/5 border border-[#0f2a44]/10 rounded-xl"
      >
        <span className="text-archon-xs font-black uppercase tracking-widest text-slate-400">
          Deja tu reseña
        </span>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`rating-star-${n}`}
              onClick={(): void => setRating(n)}
              className="focus:outline-none"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          data-testid="review-body-input"
          value={bodyText}
          onChange={(e): void => setBodyText(e.target.value)}
          placeholder="Cuéntanos tu experiencia…"
          rows={3}
          className="w-full px-3 py-2 text-archon-md text-[#0f2a44] bg-white border border-[#0f2a44]/10 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#0f2a44]/30 placeholder:text-slate-300"
        />

        <input
          data-testid="review-work-order-input"
          type="number"
          value={workOrderId}
          onChange={(e): void => setWorkOrderId(e.target.value)}
          placeholder="ID de Orden de Trabajo (opcional)"
          className="px-3 py-2 text-archon-sm text-[#0f2a44] bg-white border border-[#0f2a44]/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2a44]/30 placeholder:text-slate-300"
        />

        {submitError && (
          <div
            data-testid="review-submit-error"
            className="flex items-center gap-1.5 text-red-400 text-archon-xs"
          >
            <AlertCircle className="w-3 h-3" />
            {submitError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            data-testid="review-submit-btn"
            disabled={!bodyText.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-archon-blue text-white text-archon-sm font-black uppercase tracking-widest rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewsPanel;
