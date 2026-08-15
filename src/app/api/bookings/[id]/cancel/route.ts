import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { cancelBookingForConsumer, findBookingById } from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import { notifyBookingCancelled } from '@/lib/notifications/consumerBookingNotifications';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: bookingId } = await context.params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
  }

  let consumerObjectId: ObjectId;
  try {
    consumerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const booking = await findBookingById(bookingId);
    const result = await cancelBookingForConsumer(bookingId, consumerObjectId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (booking) {
      const space = await findSpaceById(booking.spaceId.toString());
      await notifyBookingCancelled({
        bookingId,
        consumerId: booking.consumerId,
        spaceTitle: space?.title,
        reason: 'consumer',
      });
      await recordAdminActivity({
        type: 'booking_cancelled',
        actorLabel: 'Consumer',
        actionLabel: 'Cancelled a booking',
        contextLabel: space?.title ?? 'Parking space',
        status: 'warning',
        entityId: bookingId,
      });
    }
    return NextResponse.json({ success: true, message: 'Booking cancelled. No refunds are issued for cancellations.' });
  } catch (error) {
    console.error('Cancel booking failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
