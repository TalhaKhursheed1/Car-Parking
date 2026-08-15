import { ObjectId, type Document } from 'mongodb';

import { getDb } from '@/lib/db';
import { platformFeeAudDollars } from '@/lib/stripe/fees';

/**
 * Aggregation helpers for the admin metrics dashboard.
 *
 * Each helper runs a single Mongo aggregation - the dashboard composes
 * them in parallel so the route handler stays thin and we don't transfer
 * giant booking lists to Node just to count them.
 *
 * All "paid" / "revenue" numbers use `bookings.updatedAt` as the paid-at
 * proxy (the moment the webhook flipped status to `confirmed`), which is
 * consistent with the existing income tracker.
 */

const BOOKINGS = 'bookings';
const SPACES = 'spaces';
const USERS = 'users';
const REVIEWS = 'reviews';
const LIKES = 'spaceLikes';

export type UsersByRole = {
  consumer: number;
  provider: number;
  admin: number;
  total: number;
};

export async function countUsersByRole(): Promise<UsersByRole> {
  const db = await getDb();
  const rows = await db
    .collection(USERS)
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ])
    .toArray();

  const out: UsersByRole = { consumer: 0, provider: 0, admin: 0, total: 0 };
  for (const row of rows) {
    if (row._id === 'consumer') out.consumer = row.count;
    else if (row._id === 'provider') out.provider = row.count;
    else if (row._id === 'admin') out.admin = row.count;
    out.total += row.count;
  }
  return out;
}

export type BookingsByStatus = {
  pendingPayment: number;
  confirmed: number;
  cancelled: number;
  total: number;
};

function matchBookingDateRange(
  field: 'createdAt' | 'updatedAt',
  from: Date | null,
  to: Date | null,
): Document | null {
  if (!from && !to) return null;
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [field]: range };
}

export async function countBookingsByStatus(params: {
  /** Restrict to bookings whose paid-time (`updatedAt`) falls in this range. */
  paidAfter?: Date | null;
  paidBefore?: Date | null;
} = {}): Promise<BookingsByStatus> {
  const db = await getDb();
  const range = matchBookingDateRange(
    'updatedAt',
    params.paidAfter ?? null,
    params.paidBefore ?? null,
  );

  const match = range ?? {};
  const rows = await db
    .collection(BOOKINGS)
    .aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  const out: BookingsByStatus = {
    pendingPayment: 0,
    confirmed: 0,
    cancelled: 0,
    total: 0,
  };
  for (const row of rows) {
    if (row._id === 'pending_payment') out.pendingPayment = row.count;
    else if (row._id === 'confirmed') out.confirmed = row.count;
    else if (row._id === 'cancelled') out.cancelled = row.count;
    out.total += row.count;
  }
  return out;
}

export type SpaceCatalogueMetrics = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  archived: number;
  active: number;
  recommended: number;
};

export async function summariseSpaceCatalogue(): Promise<SpaceCatalogueMetrics> {
  const db = await getDb();
  const [byStatus, byFlags] = await Promise.all([
    db
      .collection(SPACES)
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection(SPACES)
      .aggregate<{
        _id: null;
        total: number;
        active: number;
        recommended: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            recommended: {
              $sum: { $cond: [{ $eq: ['$isRecommended', true] }, 1, 0] },
            },
          },
        },
      ])
      .toArray(),
  ]);

  const out: SpaceCatalogueMetrics = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    archived: 0,
    active: 0,
    recommended: 0,
  };
  for (const row of byStatus) {
    if (row._id === 'approved') out.approved = row.count;
    else if (row._id === 'pending') out.pending = row.count;
    else if (row._id === 'rejected') out.rejected = row.count;
    else if (row._id === 'archived') out.archived = row.count;
  }
  const flags = byFlags[0];
  if (flags) {
    out.total = flags.total;
    out.active = flags.active;
    out.recommended = flags.recommended;
  }
  return out;
}

export type ReviewMetrics = {
  totalReviews: number;
  averageRating: number;
  reviewedSpaces: number;
};

export async function summariseReviews(): Promise<ReviewMetrics> {
  const db = await getDb();
  const rows = await db
    .collection(REVIEWS)
    .aggregate<{ _id: null; totalReviews: number; averageRating: number; reviewedSpaces: number }>(
      [
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            spaceIds: { $addToSet: '$spaceId' },
          },
        },
        {
          $project: {
            totalReviews: 1,
            averageRating: 1,
            reviewedSpaces: { $size: '$spaceIds' },
          },
        },
      ],
    )
    .toArray();

  const row = rows[0];
  if (!row) return { totalReviews: 0, averageRating: 0, reviewedSpaces: 0 };
  return {
    totalReviews: row.totalReviews,
    averageRating: Math.round((row.averageRating ?? 0) * 10) / 10,
    reviewedSpaces: row.reviewedSpaces,
  };
}

export async function countSpaceLikes(): Promise<{ totalLikes: number; uniqueLikers: number }> {
  const db = await getDb();
  const rows = await db
    .collection(LIKES)
    .aggregate<{ _id: null; totalLikes: number; uniqueLikers: number }>([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: 1 },
          consumerIds: { $addToSet: '$consumerId' },
        },
      },
      {
        $project: {
          totalLikes: 1,
          uniqueLikers: { $size: '$consumerIds' },
        },
      },
    ])
    .toArray();
  const row = rows[0];
  return {
    totalLikes: row?.totalLikes ?? 0,
    uniqueLikers: row?.uniqueLikers ?? 0,
  };
}

export type ConfirmedRevenueInRange = {
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  bookings: number;
};

/**
 * Sums gross / commission / provider net across confirmed bookings paid
 * in the given range. Uses `platformFeeAmount` when present and falls
 * back to the closed-form 10% commission so older bookings still report.
 */
export async function aggregateConfirmedRevenueInRange(params: {
  paidAfter?: Date | null;
  paidBefore?: Date | null;
}): Promise<ConfirmedRevenueInRange> {
  const db = await getDb();
  const range = matchBookingDateRange(
    'updatedAt',
    params.paidAfter ?? null,
    params.paidBefore ?? null,
  );

  const rows = await db
    .collection(BOOKINGS)
    .aggregate<{
      _id: null;
      grossAud: number;
      platformCommissionAud: number;
      bookings: number;
    }>([
      { $match: { status: 'confirmed', ...(range ?? {}) } },
      {
        $addFields: {
          resolvedFeeAud: {
            $ifNull: [
              '$platformFeeAmount',
              {
                $divide: [
                  {
                    $round: {
                      $divide: [
                        { $multiply: [{ $round: { $multiply: ['$totalAmount', 100] } }, 1000] },
                        10000,
                      ],
                    },
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          grossAud: { $sum: '$totalAmount' },
          platformCommissionAud: { $sum: '$resolvedFeeAud' },
          bookings: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const row = rows[0];
  if (!row) {
    return { grossAud: 0, platformCommissionAud: 0, providerShareAud: 0, bookings: 0 };
  }
  const grossAud = Math.round(row.grossAud * 100) / 100;
  const platformCommissionAud = Math.round(row.platformCommissionAud * 100) / 100;
  const providerShareAud = Math.round((grossAud - platformCommissionAud) * 100) / 100;
  return {
    grossAud,
    platformCommissionAud,
    providerShareAud,
    bookings: row.bookings,
  };
}

export type TopSpaceRow = {
  spaceId: string;
  title: string;
  city: string | null;
  state: string | null;
  bookings: number;
  grossAud: number;
};

export async function listTopSpacesByRevenue(params: {
  paidAfter?: Date | null;
  paidBefore?: Date | null;
  limit?: number;
}): Promise<TopSpaceRow[]> {
  const db = await getDb();
  const range = matchBookingDateRange('updatedAt', params.paidAfter ?? null, params.paidBefore ?? null);
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 25);

  const rows = await db
    .collection(BOOKINGS)
    .aggregate<{
      _id: ObjectId;
      bookings: number;
      grossAud: number;
      title: string;
      city: string | null;
      state: string | null;
    }>([
      { $match: { status: 'confirmed', ...(range ?? {}) } },
      {
        $group: {
          _id: '$spaceId',
          bookings: { $sum: 1 },
          grossAud: { $sum: '$totalAmount' },
        },
      },
      { $sort: { grossAud: -1, bookings: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: SPACES,
          localField: '_id',
          foreignField: '_id',
          as: 'space',
        },
      },
      { $unwind: { path: '$space', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          bookings: 1,
          grossAud: 1,
          title: { $ifNull: ['$space.title', 'Unknown space'] },
          city: { $ifNull: ['$space.city', null] },
          state: { $ifNull: ['$space.state', null] },
        },
      },
    ])
    .toArray();

  return rows.map((row) => ({
    spaceId: row._id.toHexString(),
    title: row.title,
    city: row.city,
    state: row.state,
    bookings: row.bookings,
    grossAud: Math.round(row.grossAud * 100) / 100,
  }));
}

export type TopProviderRow = {
  providerId: string;
  fullName: string;
  email: string;
  bookings: number;
  grossAud: number;
  netAud: number;
};

export async function listTopProvidersByRevenue(params: {
  paidAfter?: Date | null;
  paidBefore?: Date | null;
  limit?: number;
}): Promise<TopProviderRow[]> {
  const db = await getDb();
  const range = matchBookingDateRange('updatedAt', params.paidAfter ?? null, params.paidBefore ?? null);
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 25);

  const rows = await db
    .collection(BOOKINGS)
    .aggregate<{
      _id: ObjectId;
      bookings: number;
      grossAud: number;
      platformFeeAud: number;
      fullName: string;
      email: string;
    }>([
      { $match: { status: 'confirmed', ...(range ?? {}) } },
      {
        $group: {
          _id: '$providerId',
          bookings: { $sum: 1 },
          grossAud: { $sum: '$totalAmount' },
          platformFeeAud: { $sum: { $ifNull: ['$platformFeeAmount', 0] } },
        },
      },
      { $sort: { grossAud: -1, bookings: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: USERS,
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          bookings: 1,
          grossAud: 1,
          platformFeeAud: 1,
          fullName: { $ifNull: ['$user.fullName', 'Unknown provider'] },
          email: { $ifNull: ['$user.email', '—'] },
        },
      },
    ])
    .toArray();

  return rows.map((row) => {
    const gross = Math.round(row.grossAud * 100) / 100;
    const recordedFee = Math.round(row.platformFeeAud * 100) / 100;
    const fee = recordedFee > 0 ? recordedFee : platformFeeAudDollars(gross);
    const net = Math.round((gross - fee) * 100) / 100;
    return {
      providerId: row._id.toHexString(),
      fullName: row.fullName,
      email: row.email,
      bookings: row.bookings,
      grossAud: gross,
      netAud: net,
    };
  });
}
