import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  aggregateConfirmedRevenueInRange,
  countBookingsByStatus,
  countSpaceLikes,
  countUsersByRole,
  listTopProvidersByRevenue,
  listTopSpacesByRevenue,
  summariseReviews,
  summariseSpaceCatalogue,
  type BookingsByStatus,
  type ConfirmedRevenueInRange,
  type ReviewMetrics,
  type SpaceCatalogueMetrics,
  type TopProviderRow,
  type TopSpaceRow,
  type UsersByRole,
} from '@/lib/admin/metrics';
import { aggregateConfirmedPlatformCommissionAud } from '@/lib/repositories/bookings';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireAdminSession(
  request: Request,
): { adminId: ObjectId } | NextResponse<{ error: string }> {
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

/** Parse YYYY-MM-DD as a UTC day bound (start or end of day). */
function parseDayParam(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  if (endOfDay) {
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999));
  }
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0));
}

export type AdminMetricsResponse = {
  range: { from: string | null; to: string | null };
  users: UsersByRole;
  spaces: SpaceCatalogueMetrics;
  bookings: {
    inRange: BookingsByStatus;
    /** Conversion = confirmed in range / (confirmed + cancelled + pending) in range. */
    conversionRate: number | null;
  };
  /** Revenue from confirmed bookings paid in the requested range. */
  revenueInRange: ConfirmedRevenueInRange;
  /** All-time platform commission across confirmed bookings. */
  revenueAllTime: {
    platformCommissionAud: number;
    confirmedBookings: number;
  };
  reviews: ReviewMetrics;
  likes: { totalLikes: number; uniqueLikers: number };
  topSpaces: TopSpaceRow[];
  topProviders: TopProviderRow[];
};

export async function GET(request: Request) {
  const auth = requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  let paidAfter = parseDayParam(fromParam, false);
  let paidBefore = parseDayParam(toParam, true);

  if (!paidAfter && !paidBefore) {
    const now = new Date();
    paidBefore = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    paidAfter = new Date(paidBefore);
    paidAfter.setUTCDate(paidAfter.getUTCDate() - 29);
    paidAfter.setUTCHours(0, 0, 0, 0);
  }
  if (paidAfter && paidBefore && paidAfter.getTime() > paidBefore.getTime()) {
    return NextResponse.json(
      { error: 'The end date ("to") must be on or after the start date ("from").' },
      { status: 400 },
    );
  }

  try {
    const [
      users,
      spaces,
      bookings,
      revenueInRange,
      platformIncomeAllTime,
      reviews,
      likes,
      topSpaces,
      topProviders,
    ] = await Promise.all([
      countUsersByRole(),
      summariseSpaceCatalogue(),
      countBookingsByStatus({ paidAfter, paidBefore }),
      aggregateConfirmedRevenueInRange({ paidAfter, paidBefore }),
      aggregateConfirmedPlatformCommissionAud(),
      summariseReviews(),
      countSpaceLikes(),
      listTopSpacesByRevenue({ paidAfter, paidBefore, limit: 5 }),
      listTopProvidersByRevenue({ paidAfter, paidBefore, limit: 5 }),
    ]);

    const conversionDenominator =
      bookings.confirmed + bookings.cancelled + bookings.pendingPayment;
    const conversionRate =
      conversionDenominator > 0 ? bookings.confirmed / conversionDenominator : null;

    const body: AdminMetricsResponse = {
      range: {
        from: paidAfter?.toISOString() ?? null,
        to: paidBefore?.toISOString() ?? null,
      },
      users,
      spaces,
      bookings: {
        inRange: bookings,
        conversionRate: conversionRate === null ? null : Math.round(conversionRate * 1000) / 1000,
      },
      revenueInRange,
      revenueAllTime: {
        platformCommissionAud: platformIncomeAllTime.platformCommissionAud,
        confirmedBookings: platformIncomeAllTime.confirmedBookingCount,
      },
      reviews,
      likes,
      topSpaces,
      topProviders,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load admin metrics', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
