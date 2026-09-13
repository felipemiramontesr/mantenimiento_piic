import React, { useEffect, useState } from 'react';
import { Star, CheckCircle, AlertCircle, Send, MessageSquare, Hash } from 'lucide-react';
import { useSocialReviews, type SocialReview } from '../../hooks/useSocialReviews';
import ArchonField from '../../components/ArchonField';
import AT from '../../styles/archonTypography';

interface ReviewsPanelProps {
  readonly tallerOwnerId: number;
}

function StarRating({ value }: { readonly value: number }): React.ReactElement {
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

interface ReviewsHeaderProps {
  readonly avgRating: number | null;
}

/** Título "Reseñas" + calificación promedio (FC163 F2B4 Sub-Batch 4B-1). */
function ReviewsHeader({ avgRating }: ReviewsHeaderProps): React.ReactElement {
  return (
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
  );
}

/** Una tarjeta de reseña individual (FC163 F2B4 Sub-Batch 4B-1). */
function ReviewCard({ review }: { readonly review: SocialReview }): React.ReactElement {
  return (
    <div
      data-testid={`review-card-${review.id}`}
      className="flex flex-col gap-1.5 p-3 bg-white border border-[#0f2a44]/10 rounded-[4px]"
    >
      <div className="flex items-center justify-between">
        <StarRating value={review.rating} />
        {review.verified && (
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle className="w-3 h-3" />
            <span className="text-archon-xs font-black uppercase tracking-widest">Verificada</span>
          </div>
        )}
      </div>
      <p className="text-archon-sm text-[#0f2a44]/80">{review.bodyText}</p>
      <span className="text-archon-xs text-[#0f2a44]/40 uppercase tracking-widest">
        {new Date(review.createdAt).toLocaleDateString('es-MX', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
    </div>
  );
}

interface ReviewsListProps {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reviews: SocialReview[];
}

/** Estados de carga/error y listado de reseñas (FC163 F2B4 Sub-Batch 4B-1). */
function ReviewsList({ isLoading, error, reviews }: ReviewsListProps): React.ReactElement | null {
  if (isLoading) {
    return (
      <div data-testid="reviews-loading" className="flex justify-center py-6">
        <div className="w-4 h-4 border-2 border-pinnacle-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        data-testid="reviews-error"
        className="flex items-center gap-2 text-red-600 text-archon-sm font-black"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </div>
    );
  }
  return (
    <div data-testid="reviews-list" className="flex flex-col gap-3">
      {reviews.length === 0 && (
        <p
          data-testid="reviews-empty"
          className="text-archon-xs text-[#0f2a44]/40 uppercase tracking-widest text-center py-4"
        >
          Sin reseñas aún
        </p>
      )}
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

interface StarPickerProps {
  readonly rating: number;
  readonly onRatingChange: (n: number) => void;
}

/** Selector interactivo de calificación 1-5 estrellas (FC163 F2B4 Sub-Batch 4B-1). */
function StarPicker({ rating, onRatingChange }: StarPickerProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          data-testid={`rating-star-${n}`}
          onClick={(): void => onRatingChange(n)}
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
  );
}

interface NewReviewFormProps {
  readonly rating: number;
  readonly onRatingChange: (n: number) => void;
  readonly bodyText: string;
  readonly onBodyTextChange: (v: string) => void;
  readonly workOrderId: string;
  readonly onWorkOrderIdChange: (v: string) => void;
  readonly submitError: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
}

interface NewReviewFormFooterProps {
  readonly submitError: string | null;
  readonly canSubmit: boolean;
}

/** Error de envío + botón "Enviar" del formulario de reseña (FC163 F2B4 Sub-Batch 4B-1). */
function NewReviewFormFooter({
  submitError,
  canSubmit,
}: NewReviewFormFooterProps): React.ReactElement {
  return (
    <>
      {submitError && (
        <div
          data-testid="review-submit-error"
          className="flex items-center gap-1.5 text-red-600 text-archon-xs"
        >
          <AlertCircle className="w-3 h-3" />
          {submitError}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="review-submit-btn"
          disabled={!canSubmit}
          className="btn-sentinel-sky text-xs"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </div>
    </>
  );
}

/** Formulario de envío de una nueva reseña (FC163 F2B4 Sub-Batch 4B-1). */
function NewReviewForm({
  rating,
  onRatingChange,
  bodyText,
  onBodyTextChange,
  workOrderId,
  onWorkOrderIdChange,
  submitError,
  onSubmit,
}: NewReviewFormProps): React.ReactElement {
  return (
    <form
      data-testid="review-form"
      onSubmit={onSubmit}
      className="card-archon-sovereign bg-white p-6 space-y-3 [--card-accent:#0f2a44]"
    >
      <div className="card-sovereign-header !mb-0">
        <MessageSquare size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">Deja tu reseña</h3>
      </div>

      <StarPicker rating={rating} onRatingChange={onRatingChange} />

      <textarea
        data-testid="review-body-input"
        value={bodyText}
        onChange={(e): void => onBodyTextChange(e.target.value)}
        placeholder="Cuéntanos tu experiencia…"
        rows={3}
        className="w-full archon-input resize-none"
      />

      <ArchonField label="ID de Orden de Trabajo (opcional)" icon={Hash}>
        <input
          data-testid="review-work-order-input"
          type="number"
          value={workOrderId}
          onChange={(e): void => onWorkOrderIdChange(e.target.value)}
          className="archon-input"
        />
      </ArchonField>

      <NewReviewFormFooter submitError={submitError} canSubmit={Boolean(bodyText.trim())} />
    </form>
  );
}

/** Extrae un mensaje legible es-MX del error de envío de reseña (FC163 F2B4 Sub-Batch 4B-1). */
function readSubmitErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Error'
      : 'Error';
  if (msg === 'NO_VERIFIED_LINK') {
    return 'No tienes una OT cerrada o enlace verificado con este taller.';
  }
  if (msg === 'REVIEW_ALREADY_EXISTS') {
    return 'Ya enviaste una reseña para este taller.';
  }
  return msg;
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
      setSubmitError(readSubmitErrorMessage(err));
    }
  };

  return (
    <div data-testid="reviews-panel" className="flex flex-col gap-5">
      <ReviewsHeader avgRating={avgRating} />
      <ReviewsList isLoading={isLoading} error={error} reviews={reviews} />
      <NewReviewForm
        rating={rating}
        onRatingChange={setRating}
        bodyText={bodyText}
        onBodyTextChange={setBodyText}
        workOrderId={workOrderId}
        onWorkOrderIdChange={setWorkOrderId}
        submitError={submitError}
        onSubmit={(e): void => {
          handleSubmit(e).catch(() => undefined);
        }}
      />
    </div>
  );
};

export default ReviewsPanel;
