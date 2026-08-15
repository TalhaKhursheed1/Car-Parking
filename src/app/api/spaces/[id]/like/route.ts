import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  countSpaceLikes,
  isSpaceLikedByConsumer,
  setSpaceLike,
} from '@/lib/repositories/spaceLikes';
import {
  consumerHasConfirmedBookingForSpace,
} from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

async function resolveConsumer(req: Request): Promise<
  | { ok: true; consumerId: ObjectId }
  | { ok: false; response: NextResponse }
> {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  if (role !== 'consumer') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  try {
    return { ok: true, consumerId: new ObjectId(userId) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }),
    };
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: spaceId } = await context.params;
  if (!spaceId) {
    return NextResponse.json({ error: 'Missing space id' }, { status: 400 });
  }

  let spaceObjectId: ObjectId;
  try {
    spaceObjectId = new ObjectId(spaceId);
  } catch {
    return NextResponse.json({ error: 'Invalid space id' }, { status: 400 });
  }

  try {
    const likeCount = await countSpaceLikes(spaceObjectId);
    const session = getSessionFromRequest<SessionPayload>(req);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    let liked = false;
    if (userId && role === 'consumer') {
      try {
        liked = await isSpaceLikedByConsumer(new ObjectId(userId), spaceObjectId);
      } catch {
        liked = false;
      }
    }
    return NextResponse.json({ liked, likeCount });
  } catch (error) {
    console.error('Failed to load like state', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Toggle (or set explicitly) the consumer's like on this space.
 * Body: { liked?: boolean }. If `liked` is omitted the current value is flipped.
 * Consumers must have at least one confirmed booking for the space.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await resolveConsumer(req);
  if (!session.ok) return session.response;

  const { id: spaceId } = await context.params;
  if (!spaceId) {
    return NextResponse.json({ error: 'Missing space id' }, { status: 400 });
  }

  let spaceObjectId: ObjectId;
  try {
    spaceObjectId = new ObjectId(spaceId);
  } catch {
    return NextResponse.json({ error: 'Invalid space id' }, { status: 400 });
  }

  let desired: boolean | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { liked?: unknown };
    if (typeof body.liked === 'boolean') {
      desired = body.liked;
    }
  } catch {
    desired = undefined;
  }

  try {
    const space = await findSpaceById(spaceId);
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }
    const hasBooking = await consumerHasConfirmedBookingForSpace(
      session.consumerId,
      spaceObjectId,
    );
    if (!hasBooking) {
      return NextResponse.json(
        { error: 'You can only like spaces you have booked.' },
        { status: 403 },
      );
    }

    const current = await isSpaceLikedByConsumer(session.consumerId, spaceObjectId);
    const next = typeof desired === 'boolean' ? desired : !current;
    const result = await setSpaceLike(session.consumerId, spaceObjectId, next);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to toggle space like', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
