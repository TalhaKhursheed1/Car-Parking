import { NextResponse } from 'next/server';
import { ObjectId, WithId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { createConsumerBooking, type Booking } from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import { notifyBookingCreatedPendingPayment } from '@/lib/notifications/consumerBookingNotifications';
import { getSystemSettings } from '@/lib/repositories/systemSettings';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type PostBody = {
  spaceId?: string;
  startAt?: string;
  endAt?: string;
};

function serializeBooking(booking: WithId<Booking>) {
  return {
    id: booking._id.toString(),
    spaceId: booking.spaceId.toString(),
    consumerId: booking.consumerId.toString(),
    providerId: booking.providerId.toString(),
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    pricingMode: booking.pricingMode,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    paymentDueAt: booking.paymentDueAt ? booking.paymentDueAt.toISOString() : null,
  };
}

export async function POST(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Only consumers can create bookings' }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { spaceId, startAt: startRaw, endAt: endRaw } = body;
  if (!spaceId || typeof spaceId !== 'string' || !startRaw || !endRaw) {
    return NextResponse.json(
      { error: 'spaceId, startAt, and endAt (ISO strings) are required' },
      { status: 400 },
    );
  }

  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);
  if (Number.isNaN(+startAt) || Number.isNaN(+endAt)) {
    return NextResponse.json({ error: 'startAt and endAt must be valid ISO date strings' }, { status: 400 });
  }

  const systemSettings = await getSystemSettings();
  if (systemSettings.maintenanceMode) {
    return NextResponse.json(
      { error: 'Bookings are temporarily unavailable while maintenance is in progress.' },
      { status: 503 },
    );
  }
  const maxStartAt = new Date(Date.now() + systemSettings.maxBookingDays * 24 * 60 * 60 * 1000);
  if (startAt.getTime() > maxStartAt.getTime()) {
    return NextResponse.json(
      { error: `Bookings can only be created up to ${systemSettings.maxBookingDays} day(s) in advance.` },
      { status: 400 },
    );
  }

  let consumerId: ObjectId;
  try {
    consumerId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const result = await createConsumerBooking({
    spaceId,
    consumerId,
    startAt,
    endAt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const space = await findSpaceById(result.booking.spaceId.toString());
    await notifyBookingCreatedPendingPayment({
      bookingId: result.booking._id.toString(),
      consumerId,
      spaceTitle: space?.title,
    });
    await recordAdminActivity({
      type: 'booking_created',
      actorLabel: 'Consumer',
      actionLabel: 'Created a booking',
      contextLabel: space?.title ?? 'Parking space',
      status: 'info',
      entityId: result.booking._id.toString(),
    });
  } catch (err) {
    console.warn('[booking] create notification failed', err);
  }

  return NextResponse.json({ booking: serializeBooking(result.booking) }, { status: 201 });
}
