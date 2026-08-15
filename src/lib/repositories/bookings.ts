import { ClientSession, ObjectId, WithId } from 'mongodb';

import { getDb, getMongoClient } from '@/lib/db';
import { validateBookingAgainstSpace, computeHourlyTotal } from '@/lib/booking/availability';
import { BOOKING_PAYMENT_WINDOW_MS } from '@/lib/booking/paymentDeadline';
import { effectiveBookingCapacity } from '@/lib/booking/capacity';
import type { Space } from '@/lib/repositories/spaces';
import { findPublicSpaceById, findSpacesByIds } from '@/lib/repositories/spaces';
import { createConsumerNotification } from '@/lib/repositories/notifications';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';

export { effectiveBookingCapacity } from '@/lib/booking/capacity';

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled';

export interface Booking {
  _id?: ObjectId;
  spaceId: ObjectId;
  consumerId: ObjectId;
  providerId: ObjectId;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
  pricingMode: 'hourly';
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date | null;
  /** Latest Stripe Checkout Session id for this booking (AUD payment). */
  stripeCheckoutSessionId?: string | null;
  /** Platform application fee in AUD (10% of total) after successful payment. */
  platformFeeAmount?: number | null;
  /** Human-readable invoice ref (set after successful payment flow). */
  invoiceNumber?: string | null;
  /** PDF invoice generated at least once (UTC). */
  invoiceGeneratedAt?: Date | null;
  /** Consumer invoice email delivered via Resend (UTC). */
  invoiceEmailSentAt?: Date | null;
  invoiceEmailLastError?: string | null;
  /** Pay-by deadline for `pending_payment` (booking created + payment window). */
  paymentDueAt?: Date | null;
}

const COLLECTION = 'bookings';

const BLOCKING_STATUSES: BookingStatus[] = ['pending_payment', 'confirmed'];

export async function ensureBookingIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<Booking>(COLLECTION).createIndexes([
    { key: { spaceId: 1, startAt: 1 }, name: 'booking_space_start' },
    { key: { consumerId: 1, createdAt: -1 }, name: 'booking_consumer_created' },
    { key: { providerId: 1, startAt: 1 }, name: 'booking_provider_start' },
    { key: { stripeCheckoutSessionId: 1 }, name: 'booking_stripe_session', sparse: true },
    { key: { status: 1, paymentDueAt: 1 }, name: 'booking_status_payment_due', sparse: true },
  ]);
}

export async function setBookingStripeCheckoutSession(
  bookingId: string,
  consumerId: ObjectId,
  stripeCheckoutSessionId: string,
): Promise<boolean> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(bookingId);
  } catch {
    return false;
  }
  const db = await getDb();
  const now = new Date();
  const result = await db.collection<Booking>(COLLECTION).updateOne(
    { _id: oid, consumerId, status: 'pending_payment' },
    { $set: { stripeCheckoutSessionId, updatedAt: now } },
  );
  return result.matchedCount > 0;
}

export type ConfirmBookingPaymentResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'bad_status' | 'amount_mismatch' | 'currency_mismatch' };

/**
 * Mark booking confirmed after Checkout payment (webhook). Idempotent if already confirmed.
 */
export async function confirmBookingFromPaidCheckout(params: {
  bookingId: string;
  stripeCheckoutSessionId: string;
  amountTotalCents: number;
  currency: string;
  platformFeeAud: number;
}): Promise<ConfirmBookingPaymentResult> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(params.bookingId);
  } catch {
    return { ok: false, reason: 'not_found' };
  }

  const db = await getDb();
  const booking = await db.collection<Booking>(COLLECTION).findOne({ _id: oid });
  if (!booking) {
    return { ok: false, reason: 'not_found' };
  }
  if (booking.status === 'confirmed') {
    return { ok: true };
  }
  if (booking.status !== 'pending_payment') {
    return { ok: false, reason: 'bad_status' };
  }

  const expectedCents = Math.round(booking.totalAmount * 100);
  if (params.amountTotalCents !== expectedCents) {
    return { ok: false, reason: 'amount_mismatch' };
  }
  if (params.currency.toLowerCase() !== booking.currency.toLowerCase()) {
    return { ok: false, reason: 'currency_mismatch' };
  }

  const now = new Date();
  const result = await db.collection<Booking>(COLLECTION).updateOne(
    { _id: oid, status: 'pending_payment' },
    {
      $set: {
        status: 'confirmed',
        stripeCheckoutSessionId: params.stripeCheckoutSessionId,
        platformFeeAmount: params.platformFeeAud,
        updatedAt: now,
      },
    },
  );

  if (result.matchedCount > 0) {
    return { ok: true };
  }

  const again = await db.collection<Booking>(COLLECTION).findOne({ _id: oid });
  if (again?.status === 'confirmed') {
    return { ok: true };
  }
  return { ok: false, reason: 'bad_status' };
}

export async function listBookingsByProvider(providerId: ObjectId): Promise<WithId<Booking>[]> {
  const db = await getDb();
  return db
    .collection<Booking>(COLLECTION)
    .find({ providerId })
    .sort({ startAt: -1 })
    .limit(500)
    .toArray();
}

/**
 * Confirmed bookings for admin income reporting. `updatedAt` is used as paid-at proxy after checkout.
 */
export async function listBookingsForIncomeReport(params: {
  paidAfter?: Date | null;
  paidBefore?: Date | null;
  limit?: number;
}): Promise<WithId<Booking>[]> {
  const db = await getDb();
  const limit = Math.min(params.limit ?? 500, 1000);
  const query: Record<string, unknown> = { status: 'confirmed' };
  if (params.paidAfter || params.paidBefore) {
    const range: Record<string, Date> = {};
    if (params.paidAfter) range.$gte = params.paidAfter;
    if (params.paidBefore) range.$lte = params.paidBefore;
    query.updatedAt = range;
  }
  return db
    .collection<Booking>(COLLECTION)
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

/** Earnings report filter: `paid` = confirmed; pending/cancelled/all per booking status. */
export type ProviderEarningsStatusFilter =
  | 'paid'
  | 'pending'
  | 'cancelled'
  | 'cancelled_unpaid'
  | 'cancelled_paid'
  | 'all';

function buildDateRange(
  paidAfter?: Date | null,
  paidBefore?: Date | null,
): { $gte?: Date; $lte?: Date } | null {
  if (!paidAfter && !paidBefore) {
    return null;
  }
  const range: { $gte?: Date; $lte?: Date } = {};
  if (paidAfter) range.$gte = paidAfter;
  if (paidBefore) range.$lte = paidBefore;
  return range;
}

function relevantReportTime(b: WithId<Booking>): number {
  if (b.status === 'confirmed') {
    return b.updatedAt.getTime();
  }
  if (b.status === 'pending_payment') {
    return b.createdAt.getTime();
  }
  if (b.status === 'cancelled') {
    return (b.cancelledAt ?? b.updatedAt).getTime();
  }
  return b.updatedAt.getTime();
}

/**
 * Provider earnings rows: filter by payment/booking status and date range.
 * Date semantics: **paid** → `updatedAt`; **pending** → `createdAt`; **cancelled** → `cancelledAt` or `updatedAt` if unset.
 */
export async function listBookingsForProviderEarningsReport(params: {
  providerId: ObjectId;
  paidAfter?: Date | null;
  paidBefore?: Date | null;
  filter: ProviderEarningsStatusFilter;
  limit?: number;
}): Promise<WithId<Booking>[]> {
  const db = await getDb();
  const cap = Math.min(params.limit ?? 1000, 1000);
  const fetchCap = Math.min(cap * 3, 3000);
  const dr = buildDateRange(params.paidAfter, params.paidBefore);
  const pid = params.providerId;
  const { filter } = params;

  const cancelledDateOrFallback = (range: { $gte?: Date; $lte?: Date }) => ({
    $or: [
      { cancelledAt: range },
      {
        $and: [
          { $or: [{ cancelledAt: null }, { cancelledAt: { $exists: false } }] },
          { updatedAt: range },
        ],
      },
    ],
  });

  let query: Record<string, unknown>;

  switch (filter) {
    case 'paid':
      query = { providerId: pid, status: 'confirmed' as const, ...(dr ? { updatedAt: dr } : {}) };
      break;
    case 'pending':
      query = { providerId: pid, status: 'pending_payment' as const, ...(dr ? { createdAt: dr } : {}) };
      break;
    case 'cancelled':
      query =
        dr ?
          { providerId: pid, status: 'cancelled' as const, ...cancelledDateOrFallback(dr) }
        : { providerId: pid, status: 'cancelled' as const };
      break;
    case 'cancelled_unpaid':
      query = {
        providerId: pid,
        status: 'cancelled' as const,
        $and: [
          { $or: [{ platformFeeAmount: null }, { platformFeeAmount: { $exists: false } }] },
          ...(dr ? [cancelledDateOrFallback(dr)] : [{ _id: { $exists: true } }]),
        ],
      };
      break;
    case 'cancelled_paid':
      query = {
        providerId: pid,
        status: 'cancelled' as const,
        $and: [
          { platformFeeAmount: { $exists: true, $ne: null } },
          ...(dr ? [cancelledDateOrFallback(dr)] : [{ _id: { $exists: true } }]),
        ],
      };
      break;
    case 'all':
      query = {
        providerId: pid,
        $or: [
          { status: 'confirmed' as const, ...(dr ? { updatedAt: dr } : {}) },
          { status: 'pending_payment' as const, ...(dr ? { createdAt: dr } : {}) },
          dr ?
            { status: 'cancelled' as const, ...cancelledDateOrFallback(dr) }
          : { status: 'cancelled' as const },
        ],
      };
      break;
    default:
      query = { providerId: pid, status: 'confirmed' as const, ...(dr ? { updatedAt: dr } : {}) };
  }

  let cursor = db.collection<Booking>(COLLECTION).find(query);

  if (filter === 'all') {
    cursor = cursor.limit(fetchCap);
  } else if (filter === 'paid') {
    cursor = cursor.sort({ updatedAt: -1 }).limit(cap);
  } else if (filter === 'pending') {
    cursor = cursor.sort({ createdAt: -1 }).limit(cap);
  } else {
    cursor = cursor.sort({ updatedAt: -1 }).limit(fetchCap);
  }

  let rows = await cursor.toArray();

  if (filter === 'all' || filter.startsWith('cancelled')) {
    rows.sort((a, b) => relevantReportTime(b) - relevantReportTime(a));
    rows = rows.slice(0, cap);
  }

  return rows;
}

/**
 * Confirmed, paid bookings for a single provider (income / earnings). `updatedAt` is paid-at proxy.
 */
export async function listBookingsForProviderIncomeReport(params: {
  providerId: ObjectId;
  paidAfter?: Date | null;
  paidBefore?: Date | null;
  limit?: number;
}): Promise<WithId<Booking>[]> {
  return listBookingsForProviderEarningsReport({
    providerId: params.providerId,
    paidAfter: params.paidAfter,
    paidBefore: params.paidBefore,
    filter: 'paid',
    limit: params.limit,
  });
}

export async function countProviderBookingsByStatus(
  providerId: ObjectId,
  status: BookingStatus,
): Promise<number> {
  const db = await getDb();
  return db.collection<Booking>(COLLECTION).countDocuments({ providerId, status });
}

/** Confirmed bookings whose payment completion time (`updatedAt`) is on or after `since`. */
export async function countProviderConfirmedUpdatedSince(
  providerId: ObjectId,
  since: Date,
): Promise<number> {
  const db = await getDb();
  return db.collection<Booking>(COLLECTION).countDocuments({
    providerId,
    status: 'confirmed',
    updatedAt: { $gte: since },
  });
}

export async function listRecentConfirmedBookingsForProvider(
  providerId: ObjectId,
  limit: number,
): Promise<WithId<Booking>[]> {
  const db = await getDb();
  const cap = Math.min(Math.max(limit, 1), 20);
  return db
    .collection<Booking>(COLLECTION)
    .find({ providerId, status: 'confirmed' })
    .sort({ updatedAt: -1 })
    .limit(cap)
    .toArray();
}

/**
 * Confirmed (paid) bookings whose payment time (`updatedAt`) falls in the current month (UTC).
 */
export async function countProviderConfirmedPaidInCurrentUtcMonth(
  providerId: ObjectId,
  referenceTime: Date = new Date(),
): Promise<number> {
  const y = referenceTime.getUTCFullYear();
  const m = referenceTime.getUTCMonth();
  const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const monthEndExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  const db = await getDb();
  return db.collection<Booking>(COLLECTION).countDocuments({
    providerId,
    status: 'confirmed',
    updatedAt: { $gte: monthStart, $lt: monthEndExclusive },
  });
}

/** Sum platform commission across all confirmed bookings (matches income report fee logic). */
export async function aggregateConfirmedPlatformCommissionAud(): Promise<{
  platformCommissionAud: number;
  confirmedBookingCount: number;
}> {
  const db = await getDb();
  const rows = await db
    .collection<Booking>(COLLECTION)
    .aggregate<{
      platformCommissionAud: number;
      confirmedBookingCount: number;
    }>([
      { $match: { status: 'confirmed' } },
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
          platformCommissionAud: { $sum: '$resolvedFeeAud' },
          confirmedBookingCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const row = rows[0];
  if (!row) {
    return { platformCommissionAud: 0, confirmedBookingCount: 0 };
  }
  return {
    platformCommissionAud: Math.round(row.platformCommissionAud * 100) / 100,
    confirmedBookingCount: row.confirmedBookingCount,
  };
}

/**
 * Confirmed bookings whose rental window is in progress (start ≤ now < end).
 */
export async function countActiveConfirmedBookings(referenceTime: Date = new Date()): Promise<number> {
  const db = await getDb();
  return db.collection<Booking>(COLLECTION).countDocuments({
    status: 'confirmed',
    startAt: { $lte: referenceTime },
    endAt: { $gt: referenceTime },
  });
}

/**
 * Returns true if the consumer has at least one confirmed booking for the given space.
 * Used to gate features like rating + liking that require having actually booked the space.
 */
export async function consumerHasConfirmedBookingForSpace(
  consumerId: ObjectId,
  spaceId: ObjectId,
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .collection<Booking>(COLLECTION)
    .findOne(
      { consumerId, spaceId, status: 'confirmed' },
      { projection: { _id: 1 } },
    );
  return Boolean(row);
}

/**
 * Find ANY confirmed booking by this consumer for this space whose rental
 * window has already ended. Returns the booking's `_id` (used as the
 * provenance `bookingId` on the review row) or null if none qualifies.
 *
 * "Reviewable" = consumer actually used the space, not just paid for a
 * future stay. Cancelled bookings never qualify.
 */
export async function findReviewableBookingForSpace(
  consumerId: ObjectId,
  spaceId: ObjectId,
): Promise<ObjectId | null> {
  const db = await getDb();
  const now = new Date();
  const row = await db
    .collection<Booking>(COLLECTION)
    .findOne(
      { consumerId, spaceId, status: 'confirmed', endAt: { $lte: now } },
      { projection: { _id: 1 }, sort: { endAt: -1 } },
    );
  return row?._id ?? null;
}

export async function listBookingsByConsumer(consumerId: ObjectId): Promise<WithId<Booking>[]> {
  const db = await getDb();
  return db
    .collection<Booking>(COLLECTION)
    .find({ consumerId })
    .sort({ startAt: -1 })
    .limit(200)
    .toArray();
}

export async function findBookingById(bookingId: string): Promise<WithId<Booking> | null> {
  const db = await getDb();
  try {
    return db.collection<Booking>(COLLECTION).findOne({ _id: new ObjectId(bookingId) });
  } catch {
    return null;
  }
}

/** Stable invoice number per booking (persists on first invoice generation). */
export function deterministicInvoiceNumber(bookingId: string): string {
  const hex = bookingId.replace(/[^a-fA-F0-9]/g, '');
  const suffix = hex.slice(-12).toUpperCase();
  return `INV-${suffix}`;
}

export async function ensureBookingInvoiceNumberPersisted(bookingId: string): Promise<string | null> {
  const booking = await findBookingById(bookingId);
  if (!booking || booking.status !== 'confirmed') {
    return null;
  }
  if (booking.invoiceNumber?.trim()) {
    return booking.invoiceNumber.trim();
  }
  const num = deterministicInvoiceNumber(bookingId);
  const db = await getDb();
  await db.collection<Booking>(COLLECTION).updateOne(
    { _id: booking._id },
    { $set: { invoiceNumber: num, updatedAt: new Date() } },
  );
  return num;
}

/** Record first successful PDF generation time (idempotent). */
export async function ensureBookingInvoiceGeneratedTimestamp(bookingId: string): Promise<void> {
  const booking = await findBookingById(bookingId);
  if (!booking?._id || booking.invoiceGeneratedAt) {
    return;
  }
  const db = await getDb();
  const now = new Date();
  await db.collection<Booking>(COLLECTION).updateOne(
    {
      _id: booking._id,
      $or: [{ invoiceGeneratedAt: { $exists: false } }, { invoiceGeneratedAt: null }],
    },
    { $set: { invoiceGeneratedAt: now, updatedAt: now } },
  );
}

export async function markBookingInvoiceEmailSent(bookingId: string): Promise<void> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(bookingId);
  } catch {
    return;
  }
  const db = await getDb();
  const now = new Date();
  await db.collection<Booking>(COLLECTION).updateOne(
    { _id: oid },
    {
      $set: { invoiceEmailSentAt: now, updatedAt: now },
      $unset: { invoiceEmailLastError: '' },
    },
  );
}

export async function setBookingInvoiceEmailError(bookingId: string, message: string): Promise<void> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(bookingId);
  } catch {
    return;
  }
  const db = await getDb();
  await db.collection<Booking>(COLLECTION).updateOne(
    { _id: oid },
    { $set: { invoiceEmailLastError: message.slice(0, 500), updatedAt: new Date() } },
  );
}

export type CancelBookingResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Auto-cancel `pending_payment` bookings past `paymentDueAt` (US20). Idempotent; safe to call often.
 */
export async function expirePendingBookingsPastDue(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const dueRows = await db
    .collection<Booking>(COLLECTION)
    .find(
      {
        status: 'pending_payment',
        paymentDueAt: { $lte: now },
      },
      { projection: { _id: 1, consumerId: 1, spaceId: 1 } },
    )
    .toArray();

  if (!dueRows.length) return 0;

  const cancelled: Array<{ bookingId: ObjectId; consumerId: ObjectId; spaceId: ObjectId }> = [];
  for (const row of dueRows) {
    const result = await db.collection<Booking>(COLLECTION).deleteOne({
      _id: row._id,
      status: 'pending_payment',
      paymentDueAt: { $lte: now },
    });
    if ((result.deletedCount ?? 0) > 0) {
      cancelled.push({
        bookingId: row._id!,
        consumerId: row.consumerId,
        spaceId: row.spaceId,
      });
    }
  }

  if (!cancelled.length) return 0;

  try {
    const uniqueSpaceIds = [...new Set(cancelled.map((row) => row.spaceId.toString()))].map((id) => new ObjectId(id));
    const spaces = await findSpacesByIds(uniqueSpaceIds);
    const titleBySpaceId = new Map(spaces.map((s) => [s._id?.toString() ?? '', s.title]));

    await Promise.all(
      cancelled.map((row) =>
        createConsumerNotification({
          userId: row.consumerId,
          bookingId: row.bookingId,
          type: 'payment_expired',
          title: 'Payment window ended',
          message: `The payment window ended before payment. ${
            titleBySpaceId.get(row.spaceId.toString()) ?? 'Your parking space'
          } is no longer reserved.`,
          dedupeKey: `booking_expired:${row.bookingId.toString()}`,
        }),
      ),
    );
    await Promise.all(
      cancelled.map((row) =>
        recordAdminActivity({
          type: 'booking_expired',
          actorLabel: 'System',
          actionLabel: 'Booking expired before payment',
          contextLabel: titleBySpaceId.get(row.spaceId.toString()) ?? 'Parking space',
          status: 'warning',
          entityId: row.bookingId.toString(),
        }),
      ),
    );
  } catch (err) {
    console.warn('[bookings] failed to create expiry notifications', err);
  }

  return cancelled.length;
}

/** Used when Stripe Checkout Session expires before payment (webhook). */
export async function cancelPendingBookingIfStillAwaitingPayment(bookingId: string): Promise<boolean> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(bookingId);
  } catch {
    return false;
  }
  const db = await getDb();
  const result = await db.collection<Booking>(COLLECTION).deleteOne({
    _id: oid,
    status: 'pending_payment',
  });
  return (result.deletedCount ?? 0) > 0;
}

/**
 * Consumer cancels their own booking. No refund processing (policy).
 * Not allowed after the booking window has ended.
 */
export async function cancelBookingForConsumer(
  bookingId: string,
  consumerId: ObjectId,
): Promise<CancelBookingResult> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(bookingId);
  } catch {
    return { ok: false, error: 'Invalid booking id', status: 400 };
  }

  const db = await getDb();
  const booking = await db.collection<Booking>(COLLECTION).findOne({ _id: oid });
  if (!booking) {
    return { ok: false, error: 'Booking not found', status: 404 };
  }
  if (!booking.consumerId.equals(consumerId)) {
    return { ok: false, error: 'Forbidden', status: 403 };
  }
  if (booking.status === 'cancelled') {
    return { ok: false, error: 'This booking is already cancelled', status: 400 };
  }

  const now = new Date();
  if (now.getTime() >= booking.endAt.getTime()) {
    return { ok: false, error: 'This booking has ended and cannot be cancelled', status: 400 };
  }

  const result = await db.collection<Booking>(COLLECTION).updateOne(
    { _id: oid, consumerId, status: { $in: BLOCKING_STATUSES } },
    { $set: { status: 'cancelled', cancelledAt: now, updatedAt: now } },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: 'Could not cancel this booking', status: 409 };
  }

  return { ok: true };
}

async function countOverlappingBookings(
  spaceId: ObjectId,
  startAt: Date,
  endAt: Date,
  session?: ClientSession,
): Promise<number> {
  const db = await getDb();
  const query = {
    spaceId,
    status: { $in: BLOCKING_STATUSES },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };
  return db.collection<Booking>(COLLECTION).countDocuments(query, session ? { session } : {});
}

export type CreateBookingInput = {
  spaceId: string;
  consumerId: ObjectId;
  startAt: Date;
  endAt: Date;
};

export type CreateBookingResult =
  | { ok: true; booking: WithId<Booking> }
  | { ok: false; error: string; status: number };

export type SlotCheckResult =
  | {
      available: true;
      estimatedTotal: number;
      currency: string;
      capacity: number;
      bookedUnits: number;
      spotsRemaining: number;
    }
  | { available: false; reason: string };

/**
 * Read-only check: schedule rules + existing bookings (no insert).
 * Used for real-time availability before POST /api/bookings.
 */
export async function checkSlotAvailability(params: {
  spaceId: string;
  startAt: Date;
  endAt: Date;
}): Promise<{ ok: true; result: SlotCheckResult } | { ok: false; error: string; status: number }> {
  const { spaceId, startAt, endAt } = params;

  await expirePendingBookingsPastDue();

  let spaceObjectId: ObjectId;
  try {
    spaceObjectId = new ObjectId(spaceId);
  } catch {
    return { ok: false, error: 'Invalid space id', status: 400 };
  }

  const space = await findPublicSpaceById(spaceId);
  if (!space) {
    return { ok: false, error: 'Space not found or not available for booking', status: 404 };
  }

  const scheduleError = validateBookingAgainstSpace(space, startAt, endAt);
  if (scheduleError) {
    return { ok: true, result: { available: false, reason: scheduleError } };
  }

  await ensureBookingIndexes();
  const overlaps = await countOverlappingBookings(spaceObjectId, startAt, endAt);
  const capacity = effectiveBookingCapacity(space);
  if (overlaps >= capacity) {
    return {
      ok: true,
      result: {
        available: false,
        reason: `All ${capacity} spot(s) are already booked for this date and time window.`,
      },
    };
  }

  const estimatedTotal = computeHourlyTotal(startAt, endAt, space.hourlyRate);
  return {
    ok: true,
    result: {
      available: true,
      estimatedTotal,
      currency: space.currency || 'AUD',
      capacity,
      bookedUnits: overlaps,
      spotsRemaining: capacity - overlaps,
    },
  };
}

async function insertBookingDoc(
  space: WithId<Space>,
  consumerId: ObjectId,
  startAt: Date,
  endAt: Date,
  session?: ClientSession,
): Promise<WithId<Booking>> {
  const db = await getDb();
  const now = new Date();
  const totalAmount = computeHourlyTotal(startAt, endAt, space.hourlyRate);
  const paymentDueAt = new Date(now.getTime() + BOOKING_PAYMENT_WINDOW_MS);
  const doc: Booking = {
    spaceId: space._id!,
    consumerId,
    providerId: space.providerId,
    startAt,
    endAt,
    status: 'pending_payment',
    totalAmount,
    currency: space.currency || 'AUD',
    pricingMode: 'hourly',
    createdAt: now,
    updatedAt: now,
    paymentDueAt,
  };
  const result = await db.collection<Booking>(COLLECTION).insertOne(doc, session ? { session } : {});
  return { _id: result.insertedId, ...doc };
}

export async function createConsumerBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { spaceId, consumerId, startAt, endAt } = input;

  let spaceObjectId: ObjectId;
  try {
    spaceObjectId = new ObjectId(spaceId);
  } catch {
    return { ok: false, error: 'Invalid space id', status: 400 };
  }

  const space = await findPublicSpaceById(spaceId);
  if (!space) {
    return { ok: false, error: 'Space not found or not available for booking', status: 404 };
  }

  if (space.providerId.equals(consumerId)) {
    return { ok: false, error: 'You cannot book your own listing', status: 403 };
  }

  const scheduleError = validateBookingAgainstSpace(space, startAt, endAt);
  if (scheduleError) {
    return { ok: false, error: scheduleError, status: 400 };
  }

  await ensureBookingIndexes();

  const capacity = effectiveBookingCapacity(space);
  const client = await getMongoClient();

  try {
    // Use a replica-set transaction when available so overlap check + insert are atomic
    // (avoids two concurrent users both passing the count before either insert).
    const booking = await client.withSession(async (session) => {
      return session.withTransaction(async () => {
        const overlaps = await countOverlappingBookings(spaceObjectId, startAt, endAt, session);
        if (overlaps >= capacity) {
          throw Object.assign(new Error('SLOT_TAKEN'), { code: 'SLOT_TAKEN' });
        }
        return insertBookingDoc(space, consumerId, startAt, endAt, session);
      });
    });
    return { ok: true, booking };
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: string }).code === 'SLOT_TAKEN') {
      return {
        ok: false,
        error: `No spots left for this time (${capacity} already booked for this window).`,
        status: 409,
      };
    }
    if (isTransactionUnsupportedError(err)) {
      const overlaps = await countOverlappingBookings(spaceObjectId, startAt, endAt);
      if (overlaps >= capacity) {
        return {
          ok: false,
          error: `No spots left for this time (${capacity} already booked for this window).`,
          status: 409,
        };
      }
      const booking = await insertBookingDoc(space, consumerId, startAt, endAt);
      return { ok: true, booking };
    }
    console.error('createConsumerBooking failed', err);
    return { ok: false, error: 'Could not complete booking', status: 500 };
  }
}

function isTransactionUnsupportedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = String((err as Error).message ?? '');
  return (
    msg.includes('Transaction numbers are only allowed on a replica set member') ||
    (msg.includes('replica set') && msg.includes('transaction')) ||
    msg.includes('Multi-document transactions are not supported')
  );
}
