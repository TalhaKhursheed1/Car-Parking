import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REVIEW_COMMENT_MAX,
  validateReviewInput,
} from '../src/lib/validation/review';

describe('validateReviewInput', () => {
  it('rejects when rating is missing', () => {
    const result = validateReviewInput({});
    assert.equal(result.ok, false);
  });

  it('rejects ratings below 1', () => {
    const result = validateReviewInput({ rating: 0 });
    assert.equal(result.ok, false);
  });

  it('rejects ratings above 5', () => {
    const result = validateReviewInput({ rating: 6 });
    assert.equal(result.ok, false);
  });

  it('rounds fractional ratings to the nearest star', () => {
    const result = validateReviewInput({ rating: 4.6 });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.rating, 5);
    }
  });

  it('treats a blank comment as null', () => {
    const result = validateReviewInput({ rating: 4, comment: '   ' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.comment, null);
    }
  });

  it('trims a non-empty comment', () => {
    const result = validateReviewInput({ rating: 5, comment: '  Great spot  ' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.comment, 'Great spot');
    }
  });

  it('rejects comments above the max length', () => {
    const tooLong = 'x'.repeat(REVIEW_COMMENT_MAX + 1);
    const result = validateReviewInput({ rating: 3, comment: tooLong });
    assert.equal(result.ok, false);
  });

  it('rejects non-string comments', () => {
    const result = validateReviewInput({ rating: 3, comment: 42 as unknown });
    assert.equal(result.ok, false);
  });
});
