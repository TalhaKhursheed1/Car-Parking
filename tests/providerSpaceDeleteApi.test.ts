import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

import { createProviderSpaceDeleteHandler } from '../src/app/api/provider/spaces/[spaceId]/route';

const providerId = new ObjectId('507f1f77bcf86cd799439011');

function makeRequest(spaceId: string) {
  return new Request(`http://localhost/api/provider/spaces/${spaceId}`, {
    method: 'DELETE',
  });
}

function makeContext(spaceId: string) {
  return {
    params: Promise.resolve({ spaceId }),
  };
}

describe('DELETE /api/provider/spaces/:spaceId', () => {
  it('archives the space when owned by the provider', async () => {
    const recorded: Record<string, unknown> = {};
    const mockSpace = {
      _id: new ObjectId('656f9ab4f0bd1c2d4b9c8a01'),
      providerId,
      status: 'approved',
      isActive: true,
    } as any;

    const handler = createProviderSpaceDeleteHandler({
      getSessionFromRequest: () => ({
        user: {
          id: providerId.toHexString(),
          role: 'provider',
        },
      }),
      findSpaceById: async () => mockSpace,
      updateSpace: async (_spaceId, updates) => {
        recorded.spaceId = _spaceId;
        recorded.updates = updates;
      },
    });

    const response = await handler(makeRequest(mockSpace._id.toHexString()), makeContext(mockSpace._id.toHexString()));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { success: true });

    assert.equal(recorded.spaceId, mockSpace._id.toHexString());
    assert.deepEqual(recorded.updates, { status: 'archived', isActive: false });
  });

  it('returns 404 when the provider does not own the space', async () => {
    const handler = createProviderSpaceDeleteHandler({
      getSessionFromRequest: () => ({
        user: {
          id: providerId.toHexString(),
          role: 'provider',
        },
      }),
      findSpaceById: async () => ({
        _id: new ObjectId('656f9ab4f0bd1c2d4b9c8a01'),
        providerId: new ObjectId('ffffffffffffffffffffffff'),
      }) as any,
      updateSpace: async () => {},
    });

    const response = await handler(makeRequest('656f9ab4f0bd1c2d4b9c8a01'), makeContext('656f9ab4f0bd1c2d4b9c8a01'));
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error, 'Space not found');
  });
});

