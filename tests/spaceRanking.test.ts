import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeWeightedRating,
  DEFAULT_GLOBAL_MEAN_RATING,
  DEFAULT_PRIOR_WEIGHT,
  rankSpacesByRating,
  type RankableSpace,
} from '../src/lib/recommendations/spaceRanking';

function space(id: string, average: number, count: number): RankableSpace {
  return { id, ratingAverage: average, ratingCount: count };
}

describe('computeWeightedRating', () => {
  it('returns 0 for un-reviewed spaces', () => {
    assert.equal(computeWeightedRating(0, 0), 0);
    assert.equal(computeWeightedRating(5, 0), 0);
    assert.equal(computeWeightedRating(0, 100), 0);
  });

  it('matches the closed-form formula with defaults', () => {
    const C = DEFAULT_GLOBAL_MEAN_RATING;
    const m = DEFAULT_PRIOR_WEIGHT;
    const R = 4.5;
    const v = 10;
    const expected =
      Math.round(((v * R + m * C) / (v + m)) * 1000) / 1000;
    assert.equal(computeWeightedRating(R, v), expected);
  });

  it('pulls low-review averages toward the global mean', () => {
    const fivestarOneReview = computeWeightedRating(5, 1);
    const fourStarFiftyReviews = computeWeightedRating(4, 50);
    assert.ok(
      fourStarFiftyReviews > fivestarOneReview,
      `expected 4★/50 (${fourStarFiftyReviews}) to outrank 5★/1 (${fivestarOneReview})`,
    );
  });

  it('respects a custom prior weight', () => {
    const noPrior = computeWeightedRating(5, 1, { priorWeight: 0 });
    assert.equal(noPrior, 5);
  });
});

describe('rankSpacesByRating', () => {
  it('drops un-reviewed candidates by default', () => {
    const ranked = rankSpacesByRating([
      space('a', 4.5, 10),
      space('b', 0, 0),
      space('c', 4.0, 25),
    ]);
    const ids = ranked.map((r) => r.space.id);
    assert.deepEqual(ids.sort(), ['a', 'c']);
    assert.ok(!ids.includes('b'));
  });

  it('respects the minReviews filter', () => {
    const ranked = rankSpacesByRating(
      [space('a', 5, 1), space('b', 4.5, 8)],
      { minReviews: 5 },
    );
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.space.id, 'b');
  });

  it('orders by weighted rating desc with review-count tiebreaker', () => {
    const candidates = [
      space('low-but-many', 4.0, 100),
      space('high-but-few', 4.9, 3),
      space('mid', 4.5, 20),
    ];
    const ranked = rankSpacesByRating(candidates);
    const top = ranked[0]?.space.id;
    const ids = ranked.map((r) => r.space.id);
    assert.equal(ranked.length, 3);
    assert.ok(top === 'mid' || top === 'low-but-many');
    assert.deepEqual(ids.includes('high-but-few'), true);
  });

  it('places spaces with more reviews first when weighted scores tie', () => {
    const tied = [
      space('few', 4.0, 5),
      space('many', 4.0, 50),
    ];
    const ranked = rankSpacesByRating(tied, { priorWeight: 0 });
    assert.equal(ranked[0]?.space.id, 'many');
    assert.equal(ranked[1]?.space.id, 'few');
  });
});
