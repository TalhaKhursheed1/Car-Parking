import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildPublicSpaceFilters } from '../src/app/api/spaces/public/route';

describe('buildPublicSpaceFilters', () => {
  it('parses numeric ranges and trims strings', () => {
    const params = new URLSearchParams({
      city: '  Sydney ',
      state: ' NSW ',
      minPrice: '5',
      maxPrice: '20',
      availabilityType: 'business_hours',
    });

    const filters = buildPublicSpaceFilters(params);
    assert.equal(filters.city, 'Sydney');
    assert.equal(filters.state, 'NSW');
    assert.equal(filters.minHourlyRate, 5);
    assert.equal(filters.maxHourlyRate, 20);
    assert.equal(filters.availabilityType, 'business_hours');
  });

  it('guards invalid custom schedule filters', () => {
    const params = new URLSearchParams({
      day: 'monday',
      startTime: '18:00',
      endTime: '09:00',
    });

    const filters = buildPublicSpaceFilters(params);
    assert.equal(filters.day, undefined);
    assert.equal(filters.startTime, undefined);
    assert.equal(filters.endTime, undefined);
  });

  it('accepts well formed custom schedule filters', () => {
    const params = new URLSearchParams({
      availabilityType: 'custom',
      day: 'friday',
      startTime: '08:00',
      endTime: '10:00',
    });

    const filters = buildPublicSpaceFilters(params);
    assert.equal(filters.day, 'Friday');
    assert.equal(filters.startTime, '08:00');
    assert.equal(filters.endTime, '10:00');
  });
});

