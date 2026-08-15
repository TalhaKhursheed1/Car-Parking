/**
 * Shared validation for consumer reviews of a booked space.
 *
 * Used by both the API route and the unit tests so they stay in lockstep.
 */

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_COMMENT_MAX = 1000;

export type ReviewInput = {
  rating?: unknown;
  comment?: unknown;
};

export type NormalizedReview = {
  rating: number;
  comment: string | null;
};

export type ReviewValidationResult =
  | { ok: true; value: NormalizedReview }
  | { ok: false; error: string };

export function validateReviewInput(input: ReviewInput): ReviewValidationResult {
  const { rating, comment } = input;

  if (typeof rating !== 'number' || !Number.isFinite(rating)) {
    return { ok: false, error: 'Rating must be a number between 1 and 5.' };
  }

  const rounded = Math.round(rating);
  if (rounded < REVIEW_RATING_MIN || rounded > REVIEW_RATING_MAX) {
    return { ok: false, error: 'Rating must be between 1 and 5 stars.' };
  }

  let trimmedComment: string | null = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string') {
      return { ok: false, error: 'Comment must be text.' };
    }
    const trimmed = comment.trim();
    if (trimmed.length > REVIEW_COMMENT_MAX) {
      return {
        ok: false,
        error: `Comment is too long (max ${REVIEW_COMMENT_MAX} characters).`,
      };
    }
    trimmedComment = trimmed.length > 0 ? trimmed : null;
  }

  return { ok: true, value: { rating: rounded, comment: trimmedComment } };
}
