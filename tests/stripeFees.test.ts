import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { audDollarsToCents, platformApplicationFeeCents, platformFeeAudDollars } from '@/lib/stripe/fees';

describe('stripe fees (10% platform)', () => {
  it('converts AUD dollars to cents', () => {
    assert.equal(audDollarsToCents(10), 1000);
    assert.equal(audDollarsToCents(10.5), 1050);
  });

  it('application fee in cents is 10% of total', () => {
    assert.equal(platformApplicationFeeCents(100), 1000);
    assert.equal(platformApplicationFeeCents(10.5), 105);
  });

  it('platform fee in AUD dollars matches cents / 100', () => {
    assert.equal(platformFeeAudDollars(100), 10);
    assert.equal(platformFeeAudDollars(100.5), 10.05);
  });
});
