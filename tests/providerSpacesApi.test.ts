import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId, WithId } from 'mongodb';

import { createProviderSpacesPostHandler } from '../src/app/api/provider/spaces/route';
import type { Space } from '../src/lib/repositories/spaces';

type MockCall = Record<string, unknown>;

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
}

if (!process.env.MONGODB_DB) {
  process.env.MONGODB_DB = 'test-db';
}

function defaultDeps() {
  const recorded: { createSpaceArgs: MockCall | null } = {
    createSpaceArgs: null,
  };

  const now = new Date('2025-01-01T00:00:00Z');
  const mockSpace: WithId<Space> = {
    _id: new ObjectId('656f9ab4f0bd1c2d4b9c8a01'),
    providerId: new ObjectId('507f1f77bcf86cd799439011'),
    title: 'Docklands',
    city: 'Melbourne',
    state: 'VIC',
    hourlyRate: 12,
    dailyRate: 50,
    currency: 'AUD',
    status: 'pending',
    isActive: false,
    images: ['https://cdn/img-1.jpg', 'https://cdn/img-2.jpg'],
    availabilityType: '24_7',
    customAvailability: [],
    amenities: ['Lighting'],
    capacity: 1,
    createdAt: now,
    updatedAt: now,
  };

  return {
    recorded,
    getSessionFromRequest: () => ({
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'provider',
      },
    }),
    ensureSpaceIndexes: async () => {},
    createSpace: async (data: MockCall) => {
      recorded.createSpaceArgs = data;
      return mockSpace;
    },
    requireStripeConnectReadyForSpaceCreation: async () => null,
  };
}

function makeRequest(payload: unknown) {
  return new Request('http://localhost/api/provider/spaces', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('POST /api/provider/spaces validation', () => {
  it('accepts a well-formed payload and normalises to 24/7, capacity 1, empty custom', async () => {
    const deps = defaultDeps();
    const handler = createProviderSpacesPostHandler(deps);

    const response = await handler(
      makeRequest({
        title: '  Docklands Rooftop ',
        description: ' Great views ',
        address: ' 1 Harbour Esplanade ',
        city: '  Melbourne ',
        state: 'VIC',
        zipCode: '3008',
        hourlyRate: 12,
        dailyRate: 50,
        currency: 'aud',
        capacity: 2,
        amenities: ['Lighting', '  '],
        availabilityType: 'custom',
        customAvailability: [
          { day: 'monday', startTime: '08:00', endTime: '18:00' },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00' },
        ],
        images: ['https://cdn/img-1.jpg', 'https://cdn/img-2.jpg'],
        isActive: false,
      }),
    );

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.data.title, 'Docklands');
    assert.ok(body.data.id);

    assert.ok(deps.recorded.createSpaceArgs);
    const args = deps.recorded.createSpaceArgs!;
    assert.equal(args.title, 'Docklands Rooftop');
    assert.equal(args.address, '1 Harbour Esplanade');
    assert.equal(args.city, 'Melbourne');
    assert.equal(args.currency, 'AUD');
    assert.deepEqual(args.amenities, ['Lighting']);
    assert.equal(args.availabilityType, '24_7');
    assert.deepEqual(args.customAvailability, []);
    assert.equal(args.capacity, 1);
  });

  it('rejects submissions with fewer than two images', async () => {
    const handler = createProviderSpacesPostHandler(defaultDeps());

    const response = await handler(
      makeRequest({
        title: 'Missing media',
        description: 'Enough text for a valid listing description field.',
        address: '1 Test Street Sydney',
        city: 'Sydney',
        state: 'NSW',
        hourlyRate: 10,
        images: ['https://cdn/img-1.jpg'],
      }),
    );

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'Please upload at least two images of the space.');
  });
});
