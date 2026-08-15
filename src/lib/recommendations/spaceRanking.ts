/**
 * Pure ranking helpers for admin-curated space recommendations.
 *
 * The platform recommends spaces based on user ratings, but raw averages
 * are misleading for spaces with very few reviews (one happy customer
 * shouldn't outrank a space with fifty 4.8-star reviews). We use a
 * Bayesian-style weighted rating to flatten that effect:
 *
 *   weightedRating = (v * R + m * C) / (v + m)
 *
 * where:
 *   R = the space's average rating
 *   v = the number of reviews for the space
 *   C = the global mean rating across the catalogue (defaults to 3.5)
 *   m = the prior weight (how many reviews you "trust" before
 *       believing R; defaults to 5)
 *
 * Pure functions only - no DB / HTTP dependencies, so this can be
 * unit-tested cleanly and reused for both the admin ranking list and
 * any other "top rated" surface.
 */

export const DEFAULT_GLOBAL_MEAN_RATING = 3.5;
export const DEFAULT_PRIOR_WEIGHT = 5;

export type RankableSpace = {
  id: string;
  ratingAverage: number;
  ratingCount: number;
};

export type RatingRankOptions = {
  /** Global average rating across the whole catalogue (defaults to 3.5). */
  globalMean?: number;
  /**
   * Prior weight `m`: how many synthetic "average" reviews to mix in.
   * Larger values pull weighted scores toward the global mean.
   */
  priorWeight?: number;
  /** Drop spaces with fewer than this many reviews (defaults to 1). */
  minReviews?: number;
};

/**
 * Bayesian-style weighted rating. Returns 0 when the space has no
 * reviews so we never recommend an un-rated listing.
 */
export function computeWeightedRating(
  ratingAverage: number,
  ratingCount: number,
  options: RatingRankOptions = {},
): number {
  if (!Number.isFinite(ratingAverage) || ratingAverage <= 0) return 0;
  if (!Number.isFinite(ratingCount) || ratingCount <= 0) return 0;

  const globalMean = options.globalMean ?? DEFAULT_GLOBAL_MEAN_RATING;
  const priorWeight = Math.max(options.priorWeight ?? DEFAULT_PRIOR_WEIGHT, 0);
  const weighted =
    (ratingCount * ratingAverage + priorWeight * globalMean) /
    (ratingCount + priorWeight);
  return Math.round(weighted * 1000) / 1000;
}

export type RankedSpace<TSpace extends RankableSpace = RankableSpace> = {
  space: TSpace;
  weightedRating: number;
};

/**
 * Sorts the given spaces by weighted rating descending, then by raw
 * review count descending as a tie-breaker. Spaces with fewer than
 * `minReviews` (default 1) are filtered out so we don't surface
 * un-reviewed listings as recommendations.
 */
export function rankSpacesByRating<TSpace extends RankableSpace>(
  spaces: TSpace[],
  options: RatingRankOptions = {},
): RankedSpace<TSpace>[] {
  const minReviews = Math.max(options.minReviews ?? 1, 0);

  const scored: RankedSpace<TSpace>[] = [];
  for (const space of spaces) {
    if (space.ratingCount < minReviews) continue;
    const weightedRating = computeWeightedRating(
      space.ratingAverage,
      space.ratingCount,
      options,
    );
    if (weightedRating <= 0) continue;
    scored.push({ space, weightedRating });
  }

  scored.sort((a, b) => {
    if (b.weightedRating !== a.weightedRating) {
      return b.weightedRating - a.weightedRating;
    }
    return b.space.ratingCount - a.space.ratingCount;
  });

  return scored;
}
