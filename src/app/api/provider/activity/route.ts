import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { buildProviderEarningsRows } from '@/lib/provider/earningsReport';
import {
  countProviderBookingsByStatus,
  countProviderConfirmedPaidInCurrentUtcMonth,
  countProviderConfirmedUpdatedSince,
  listRecentConfirmedBookingsForProvider,
} from '@/lib/repositories/bookings';
import { countActiveApprovedSpacesByProvider } from '@/lib/repositories/spaces';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireProviderSession(
  request: Request,
): { providerId: ObjectId } | NextResponse<{ error: string }> {
  const session = getSessionFromRequest<SessionPayload>(request);

  if (!session?.user?.id || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    return { providerId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }
}

export type ProviderActivityResponse = {
  /** Approved spaces with listing active (visible when available). */
  activeListingCount: number;
  /** Confirmed bookings paid in the current calendar month (UTC); `updatedAt` is payment time. */
  paidBookingsThisMonthCount: number;
  pendingPaymentCount: number;
  paidLast7DaysCount: number;
  recentPaid: Array<{
    bookingId: string;
    paidAt: string;
    spaceTitle: string;
    consumerName: string;
    providerShareAud: number;
    currency: string;
  }>;
};

export async function GET(request: Request) {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const { providerId } = sessionResult;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [
      activeListingCount,
      paidBookingsThisMonthCount,
      pendingPaymentCount,
      paidLast7DaysCount,
      recentBookings,
    ] = await Promise.all([
      countActiveApprovedSpacesByProvider(providerId),
      countProviderConfirmedPaidInCurrentUtcMonth(providerId, now),
      countProviderBookingsByStatus(providerId, 'pending_payment'),
      countProviderConfirmedUpdatedSince(providerId, sevenDaysAgo),
      listRecentConfirmedBookingsForProvider(providerId, 5),
    ]);

    const rows = await buildProviderEarningsRows(recentBookings);
    const recentPaid = rows.map((r) => ({
      bookingId: r.bookingId,
      paidAt: r.paidAt,
      spaceTitle: r.spaceTitle,
      consumerName: r.consumerName,
      providerShareAud: r.providerShareAud,
      currency: r.currency,
    }));

    const body: ProviderActivityResponse = {
      activeListingCount,
      paidBookingsThisMonthCount,
      pendingPaymentCount,
      paidLast7DaysCount,
      recentPaid,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load provider activity', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
