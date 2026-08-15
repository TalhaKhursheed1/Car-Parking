import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  findSpaceById,
  setSpaceRecommended,
} from '@/lib/repositories/spaces';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireAdminSession(request: Request):
  | { adminId: ObjectId }
  | NextResponse<{ error: string }> {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  try {
    return { adminId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 });
  }
}

/**
 * Toggle the admin-curated recommendation flag for a single space.
 * Body: { recommended: boolean }
 * Recommendation requires the space to be approved + active and to have
 * at least one consumer review so we never surface un-rated listings.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ spaceId: string }> },
) {
  const auth = requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const { spaceId } = await context.params;

  let body: { recommended?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.recommended !== 'boolean') {
    return NextResponse.json(
      { error: 'Body must include { recommended: boolean }' },
      { status: 400 },
    );
  }

  try {
    const space = await findSpaceById(spaceId);
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    if (body.recommended) {
      if (space.status !== 'approved' || !space.isActive) {
        return NextResponse.json(
          { error: 'Only approved, active spaces can be recommended.' },
          { status: 400 },
        );
      }
      if (!space.ratingCount || space.ratingCount < 1) {
        return NextResponse.json(
          { error: 'Spaces need at least one review before they can be recommended.' },
          { status: 400 },
        );
      }
    }

    const updated = await setSpaceRecommended(spaceId, body.recommended, auth.adminId);
    if (!updated) {
      return NextResponse.json({ error: 'Could not update space' }, { status: 500 });
    }

    await recordAdminActivity({
      type: body.recommended ? 'space_recommended' : 'space_unrecommended',
      actorLabel: 'Admin',
      actionLabel: body.recommended
        ? 'Recommended a space based on user ratings'
        : 'Removed a space from recommendations',
      contextLabel: updated.title,
      status: 'info',
      entityId: spaceId,
    });

    return NextResponse.json({
      space: {
        id: updated._id?.toString() ?? spaceId,
        isRecommended: updated.isRecommended ?? false,
        recommendedAt: updated.recommendedAt ? updated.recommendedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Failed to toggle space recommendation', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
