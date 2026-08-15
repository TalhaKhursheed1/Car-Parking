import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { expirePendingBookingsPastDue, listBookingsByConsumer } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(req: Request) {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let consumerObjectId: ObjectId;
  try {
    consumerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    await expirePendingBookingsPastDue();
    const bookings = await listBookingsByConsumer(consumerObjectId);
    const spaceIds = [...new Set(bookings.map((b) => b.spaceId.toString()))].map((id) => new ObjectId(id));
    const spaces = await findSpacesByIds(spaceIds);
    const spaceTitleById = new Map(spaces.map((s) => [s._id!.toString(), s.title]));

    const data = bookings.map((b) => ({
      id: b._id!.toString(),
      spaceId: b.spaceId.toString(),
      spaceTitle: spaceTitleById.get(b.spaceId.toString()) ?? 'Space',
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      status: b.status,
      totalAmount: b.totalAmount,
      currency: b.currency,
      pricingMode: b.pricingMode,
      createdAt: b.createdAt.toISOString(),
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      invoiceNumber: b.invoiceNumber ?? null,
      invoiceGeneratedAt: b.invoiceGeneratedAt ? b.invoiceGeneratedAt.toISOString() : null,
      invoiceEmailSentAt: b.invoiceEmailSentAt ? b.invoiceEmailSentAt.toISOString() : null,
      invoiceEmailLastError: b.invoiceEmailLastError ?? null,
      paymentDueAt: b.paymentDueAt ? b.paymentDueAt.toISOString() : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list consumer bookings', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
