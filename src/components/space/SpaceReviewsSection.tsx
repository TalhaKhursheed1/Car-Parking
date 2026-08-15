'use client';

import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import { useSpaceReviews } from '@/features/reviews/hooks';

interface Props {
  spaceId: string;
  ratingAverage: number;
  ratingCount: number;
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SpaceReviewsSection({ spaceId, ratingAverage, ratingCount }: Props) {
  const { data: reviews, isLoading, isError } = useSpaceReviews(spaceId);

  return (
    <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Reviews</h2>
          <p className="text-sm text-white/60">
            Feedback from consumers who have booked this space.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StarRating value={Math.round(ratingAverage)} size={20} readOnly />
          <div className="text-right">
            <p className="text-lg font-semibold text-white leading-none">
              {ratingCount > 0 ? ratingAverage.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-white/60">
              {ratingCount === 0
                ? 'No reviews yet'
                : `${ratingCount} review${ratingCount === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-white/60">Loading reviews…</p>
      ) : isError ? (
        <p className="text-sm text-white/60">Couldn&apos;t load reviews right now.</p>
      ) : !reviews || reviews.length === 0 ? (
        <p className="text-sm text-white/60">
          Be the first to leave a review after your booking is complete.
        </p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-white/10 bg-white/5 p-4"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} size={16} readOnly />
                  <span className="text-sm font-medium text-white">{r.consumerName}</span>
                </div>
                <span className="text-xs text-white/50">{formatReviewDate(r.createdAt)}</span>
              </div>
              {r.comment ? (
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                  {r.comment}
                </p>
              ) : (
                <p className="text-xs italic text-white/50">No comment provided.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
