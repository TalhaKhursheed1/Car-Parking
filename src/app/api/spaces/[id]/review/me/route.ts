import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { findReviewByConsumerAndSpace } from '@/lib/repositories/reviews';
import { findReviewableBookingForSpace } from '@/lib/repositories/bookings';

type SessionPayload = {
  user?: { id?: string; role?: string };
};

/**
 * Returns the current consumer's single review for this space (or null)
 * plus whether they're allowed to write one. The frontend uses this to
 * decide what to render on the space detail page:
 *   - eligible=false, review=null  -> hidden / "complete a booking" hint
 *   - eligible=true,  review=null  -> empty rating form
 *   - eligible=true,  review!=null -> pre-filled form with edit/delete
 *
 * Guests / providers / admins always get { eligible: false, review: null }
 * with HTTP 200 so the page renders without hitting an auth error.
 */
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

  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || role !== 'consumer') {
    return NextResponse.json({ eligible: false, review: null });
  }

  let consumerId: ObjectId;
  try {
    consumerId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ eligible: false, review: null });
  }

  try {
    const [eligibleBookingId, existing] = await Promise.all([
      findReviewableBookingForSpace(consumerId, spaceObjectId),
      findReviewByConsumerAndSpace(consumerId, spaceObjectId),
    ]);

    const review = existing
      ? {
          id: existing._id!.toString(),
          bookingId: existing.bookingId.toString(),
          spaceId: existing.spaceId.toString(),
          consumerId: existing.consumerId.toString(),
          rating: existing.rating,
          comment: existing.comment,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        }
      : null;

    // Eligibility logic:
    //   - Must have any confirmed+ended booking for this space to CREATE one.
    //   - If they already have a review, they're always allowed to EDIT/DELETE
    //     it even if no booking is currently reviewable (e.g. they wrote it
    //     after stay #1 and stay #2 hasn't ended yet).
    const eligible = Boolean(eligibleBookingId) || Boolean(existing);

    return NextResponse.json({ eligible, review });
  } catch (error) {
    console.error('Failed to load consumer review for space', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
