'use client';

import { useEffect, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import {
  REVIEW_COMMENT_MAX,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from '@/lib/validation/review';
import {
  useDeleteSpaceReview,
  useMySpaceReview,
  useUpsertSpaceReview,
} from '@/features/reviews/hooks';

interface Props {
  spaceId: string;
  spaceTitle: string;
  /**
   * When false the component just returns null (guests, providers, admins).
   * We still let the hook run conditionally inside the component for SSR
   * safety - but the caller controls visibility.
   */
  enabled: boolean;
}

/**
 * One-review-per-(consumer × space) form, mounted on the space detail page.
 *
 *   - Guests / non-consumers           -> renders nothing (parent decides)
 *   - Consumer, no eligible booking    -> short "complete a booking" hint
 *   - Consumer with eligible booking,
 *     no review yet                    -> empty rating + comment form
 *   - Consumer with existing review    -> read-only summary + Edit / Delete
 */
export default function SpaceReviewForm({ spaceId, spaceTitle, enabled }: Props) {
  const { data, isLoading } = useMySpaceReview(spaceId, enabled);
  const upsert = useUpsertSpaceReview();
  const remove = useDeleteSpaceReview();

  const review = data?.review ?? null;
  const eligible = Boolean(data?.eligible);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep the form fields in sync whenever the server-side review changes
  // (e.g. after submitting, deleting, or switching spaces).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setComment(review.comment ?? '');
    } else {
      setRating(0);
      setComment('');
    }
  }, [review]);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <Card
        className="p-5 border-white/10 bg-white/5 text-sm text-white/70"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
      >
        Loading your review…
      </Card>
    );
  }

  // Logged-in consumer but not yet eligible (no completed stay) and no
  // existing review to edit. Give them a friendly nudge instead of a form.
  if (!eligible && !review) {
    return (
      <Card
        className="p-5 border-white/10 bg-white/5"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
      >
        <p className="text-sm font-medium text-white">Want to leave a review?</p>
        <p className="text-xs text-white/60">
          Reviews unlock once you&apos;ve completed a booking at this space.
        </p>
      </Card>
    );
  }

  const hasReview = Boolean(review);
  const remaining = REVIEW_COMMENT_MAX - comment.length;
  const canSubmit =
    rating >= REVIEW_RATING_MIN && rating <= REVIEW_RATING_MAX && !upsert.isPending;

  const handleSubmit = () => {
    setErrorMessage(null);
    if (rating < REVIEW_RATING_MIN || rating > REVIEW_RATING_MAX) {
      setErrorMessage('Please select a star rating from 1 to 5.');
      return;
    }
    upsert.mutate(
      {
        spaceId,
        payload: { rating, comment: comment.trim() ? comment.trim() : null },
      },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => setErrorMessage((e as Error).message),
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm('Delete your review for this space?')) return;
    setErrorMessage(null);
    remove.mutate(
      { spaceId },
      {
        onSuccess: () => setEditing(false),
        onError: (e) => setErrorMessage((e as Error).message),
      },
    );
  };

  // --- Existing review, read-only view with Edit / Delete actions ---
  if (!editing && hasReview && review) {
    return (
      <Card
        className="p-5 border-white/10 bg-white/5"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} size={18} readOnly />
            <span className="text-sm font-semibold text-white">Your review</span>
          </div>
          <span className="text-xs text-white/50">
            {new Date(review.updatedAt).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        {review.comment ? (
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
            {review.comment}
          </p>
        ) : (
          <p className="text-xs italic text-white/50">No comment added.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={remove.isPending}
          >
            Edit review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={remove.isPending}
            className="border-red-400/50 text-white hover:bg-red-500/10"
          >
            {remove.isPending ? 'Deleting…' : 'Delete review'}
          </Button>
        </div>
        {errorMessage ? (
          <p className="text-xs text-red-300">{errorMessage}</p>
        ) : null}
      </Card>
    );
  }

  // --- Empty state: eligible but no review yet, not in editing mode ---
  if (!editing && !hasReview) {
    return (
      <Card
        className="p-5 border-white/10 bg-white/5"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Rate this space</p>
          <p className="text-xs text-white/60">
            Share how your stay went so other drivers know what to expect.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setRating(0);
              setComment('');
              setEditing(true);
            }}
          >
            Rate &amp; review
          </Button>
        </div>
      </Card>
    );
  }

  // --- Editing form (new or edit) ---
  return (
    <Card
      className="p-5 border-white/10 bg-white/5"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      <p className="text-sm text-white font-semibold">
        How was your experience at {spaceTitle}?
      </p>
      <div>
        <p className="text-xs uppercase tracking-wide text-white/60 mb-1">Rating</p>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>
      <div>
        <label
          htmlFor={`space-review-comment-${spaceId}`}
          className="block text-xs uppercase tracking-wide text-white/60 mb-1"
        >
          Comment (optional)
        </label>
        <textarea
          id={`space-review-comment-${spaceId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX))}
          maxLength={REVIEW_COMMENT_MAX}
          rows={3}
          placeholder="Share what stood out: access, cleanliness, communication…"
          className="w-full rounded-md border border-white/20 bg-slate-900/60 text-sm text-black placeholder-white/40 px-3 py-2 focus:outline-none focus:border-blue-400/70"
        />
        <p className="text-[11px] text-white/40 mt-1">
          {remaining} characters left
        </p>
      </div>
      {errorMessage ? <p className="text-xs text-red-300">{errorMessage}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {upsert.isPending ? 'Saving…' : hasReview ? 'Save changes' : 'Submit review'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(false);
            setErrorMessage(null);
            if (review) {
              setRating(review.rating);
              setComment(review.comment ?? '');
            } else {
              setRating(0);
              setComment('');
            }
          }}
          disabled={upsert.isPending}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
