import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { listBookingsByProvider } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';
import { findUsersByIds } from '@/lib/repositories/users';
import { platformFeeAudDollars } from '@/lib/stripe/fees';

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

  if (role !== 'provider') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let providerObjectId: ObjectId;
  try {
    providerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const bookings = await listBookingsByProvider(providerObjectId);

    const spaceIds = [...new Set(bookings.map((b) => b.spaceId.toString()))].map((id) => new ObjectId(id));
    const consumerIds = [...new Set(bookings.map((b) => b.consumerId.toString()))].map((id) => new ObjectId(id));

    const [spaces, users] = await Promise.all([findSpacesByIds(spaceIds), findUsersByIds(consumerIds)]);

    const spaceTitleById = new Map(spaces.map((s) => [s._id!.toString(), s.title]));
    const consumerNameById = new Map(users.map((u) => [u._id!.toString(), u.fullName]));

    const data = bookings.map((b) => {
      const platformFeeAud =
        b.platformFeeAmount != null && Number.isFinite(b.platformFeeAmount)
          ? b.platformFeeAmount
          : platformFeeAudDollars(b.totalAmount);
      const providerShareAud = Math.round((b.totalAmount - platformFeeAud) * 100) / 100;

      return {
        id: b._id!.toString(),
        spaceId: b.spaceId.toString(),
        spaceTitle: spaceTitleById.get(b.spaceId.toString()) ?? 'Unknown space',
        consumerId: b.consumerId.toString(),
        consumerName: consumerNameById.get(b.consumerId.toString()) ?? 'Consumer',
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        status: b.status,
        totalAmount: b.totalAmount,
        currency: b.currency,
        pricingMode: b.pricingMode,
        createdAt: b.createdAt.toISOString(),
        cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
        payment:
          b.status === 'confirmed'
            ? {
                paidAt: b.updatedAt.toISOString(),
                customerTotalAud: b.totalAmount,
                platformFeeAud,
                providerShareAud,
                stripeCheckoutSessionId: b.stripeCheckoutSessionId ?? null,
              }
            : null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list provider bookings', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
