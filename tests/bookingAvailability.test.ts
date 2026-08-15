import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeHourlyTotal, validateBookingAgainstSpace } from '../src/lib/booking/availability';
import { effectiveBookingCapacity } from '../src/lib/booking/capacity';
import type { Space } from '../src/lib/repositories/spaces';

function baseSpace(overrides: Partial<Space> = {}): Space {
  return {
    providerId: {} as Space['providerId'],
    title: 'Test',
    hourlyRate: 10,
    currency: 'AUD',
    availabilityType: '24_7',
    customAvailability: [],
    isActive: true,
    status: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('computeHourlyTotal', () => {
  it('bills at least one hour', () => {
    const start = new Date('2099-01-01T10:00:00.000Z');
    const end = new Date('2099-01-01T10:30:00.000Z');
    assert.equal(computeHourlyTotal(start, end, 20), 20);
  });

  it('rounds up partial hours', () => {
    const start = new Date('2099-01-01T10:00:00.000Z');
    const end = new Date('2099-01-01T11:01:00.000Z');
    assert.equal(computeHourlyTotal(start, end, 10), 20);
  });

  it('charges two hours for exactly two hours', () => {
    const start = new Date('2099-01-01T10:00:00.000Z');
    const end = new Date('2099-01-01T12:00:00.000Z');
    assert.equal(computeHourlyTotal(start, end, 15), 30);
  });
});

describe('effectiveBookingCapacity', () => {
  it('always returns 1 for single-spot listings', () => {
    assert.equal(effectiveBookingCapacity({ capacity: 12 }), 1);
    assert.equal(effectiveBookingCapacity({}), 1);
    assert.equal(effectiveBookingCapacity({ capacity: null }), 1);
    assert.equal(effectiveBookingCapacity({ capacity: 0 }), 1);
  });
});

describe('validateBookingAgainstSpace', () => {
  it('allows future 24_7 booking', () => {
    const space = baseSpace({ availabilityType: '24_7' });
    const start = new Date('2099-06-10T00:00:00.000Z');
    const end = new Date('2099-06-10T02:00:00.000Z');
    assert.equal(validateBookingAgainstSpace(space, start, end), null);
  });

  it('rejects when end is before start', () => {
    const space = baseSpace({ availabilityType: '24_7' });
    const start = new Date('2099-06-10T12:00:00.000Z');
    const end = new Date('2099-06-10T10:00:00.000Z');
    assert.equal(
      validateBookingAgainstSpace(space, start, end),
      'End date and time must be after the start date and time.',
    );
  });

  it('allows multi-day 24_7 booking', () => {
    const space = baseSpace({ availabilityType: '24_7' });
    const start = new Date('2099-06-10T00:00:00.000Z');
    const end = new Date('2099-06-14T12:00:00.000Z');
    assert.equal(validateBookingAgainstSpace(space, start, end), null);
  });

  it('rejects booking shorter than 30 minutes', () => {
    const space = baseSpace({ availabilityType: '24_7' });
    const start = new Date('2099-06-10T10:00:00.000Z');
    const end = new Date('2099-06-10T10:20:00.000Z');
    assert.equal(validateBookingAgainstSpace(space, start, end), 'Booking must be at least 30 minutes.');
  });
});
