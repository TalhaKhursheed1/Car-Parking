import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  deleteReviewByConsumerAndSpace,
  findReviewByConsumerAndSpace,
  upsertReviewForSpace,
} from '@/lib/repositories/reviews';
import { findReviewableBookingForSpace } from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import { validateReviewInput } from '@/lib/validation/review';

type SessionPayload = {
  user?: { id?: string; role?: string };
};

function unauthorized() {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

async function resolveConsumer(req: Request): Promise<
  | { ok: true; consumerId: ObjectId }
  | { ok: false; response: NextResponse }
> {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) return { ok: false, response: unauthorized() };
  if (role !== 'consumer') return { ok: false, response: forbidden() };
  try {
    return { ok: true, consumerId: new ObjectId(userId) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }),
    };
  }
}

function serializeReview(review: {
  _id?: ObjectId;
  bookingId: ObjectId;
  spaceId: ObjectId;
  consumerId: ObjectId;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: review._id?.toString() ?? '',
    bookingId: review.bookingId.toString(),
    spaceId: review.spaceId.toString(),
    consumerId: review.consumerId.toString(),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

/**
 * Create or update the current consumer's single review for this space.
 * One review per (consumer, space) - re-booking doesn't unlock a second.
 *
 * Eligibility: must have at least one confirmed booking for this space
 * whose rental window has already ended. Editing an existing review keeps
 * working forever even if the original booking is far in the past.
 */
async function handleUpsert(
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

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = validateReviewInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const space = await findSpaceById(spaceId);
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const [existingReview, eligibleBookingId] = await Promise.all([
      findReviewByConsumerAndSpace(session.consumerId, spaceObjectId),
      findReviewableBookingForSpace(session.consumerId, spaceObjectId),
    ]);

    // First-time review requires a finished stay. Editing an existing review
    // is always allowed (we already trust the original eligibility).
    if (!existingReview && !eligibleBookingId) {
      return NextResponse.json(
        {
          error:
            'You can only review a space after completing a booking for it.',
        },
        { status: 403 },
      );
    }

    const bookingIdForRow =
      existingReview?.bookingId ?? (eligibleBookingId as ObjectId);

    const { review, created } = await upsertReviewForSpace({
      bookingId: bookingIdForRow,
      spaceId: spaceObjectId,
      providerId: space.providerId,
      consumerId: session.consumerId,
      rating: parsed.value.rating,
      comment: parsed.value.comment,
    });

    return NextResponse.json(
      { review: serializeReview(review), created },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    console.error('Failed to upsert space review', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = handleUpsert;
export const PUT = handleUpsert;

export async function DELETE(
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

  try {
    const deleted = await deleteReviewByConsumerAndSpace(
      session.consumerId,
      spaceObjectId,
    );
    if (!deleted) {
      return NextResponse.json({ error: 'No review to delete' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete space review', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
