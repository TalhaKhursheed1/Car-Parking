import { ObjectId, WithId } from 'mongodb';

import { estimateStripeProcessingFeeAud, platformFeeAudDollars } from '@/lib/stripe/fees';
import type { Booking } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';
import { findUsersByIds } from '@/lib/repositories/users';

export type ProviderEarningsCancelKind = 'none' | 'unpaid' | 'after_payment';

export type ProviderEarningsRow = {
  bookingId: string;
  bookingStatus: 'confirmed' | 'pending_payment' | 'cancelled';
  cancelKind: ProviderEarningsCancelKind;
  /** ISO timestamp used for filtering / display (paid ≈ updatedAt, pending = createdAt, cancelled = cancelledAt). */
  relevantAt: string;
  paidAt: string;
  spaceTitle: string;
  consumerName: string;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
  stripeCheckoutSessionId: string | null;
  currency: string;
};

function deriveCancelKind(b: Booking): ProviderEarningsCancelKind {
  if (b.status !== 'cancelled') {
    return 'none';
  }
  if (b.platformFeeAmount != null && Number.isFinite(b.platformFeeAmount)) {
    return 'after_payment';
  }
  return 'unpaid';
}

function uniqueObjectIds(ids: ObjectId[]): ObjectId[] {
  const seen = new Set<string>();
  const out: ObjectId[] = [];
  for (const id of ids) {
    const k = id.toHexString();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(id);
    }
  }
  return out;
}

export async function buildProviderEarningsRows(
  bookings: WithId<Booking>[],
): Promise<ProviderEarningsRow[]> {
  if (bookings.length === 0) {
    return [];
  }

  const spaceIds = uniqueObjectIds(bookings.map((b) => b.spaceId));
  const consumerIds = uniqueObjectIds(bookings.map((b) => b.consumerId));

  const [spaces, users] = await Promise.all([findSpacesByIds(spaceIds), findUsersByIds(consumerIds)]);

  const spaceById = new Map(spaces.map((s) => [s._id!.toHexString(), s]));
  const userById = new Map(users.map((u) => [u._id!.toHexString(), u]));

  return bookings.map((b) => {
    const gross = b.totalAmount;
    const cancelKind = deriveCancelKind(b);

    let platformCommission =
      b.platformFeeAmount != null && Number.isFinite(b.platformFeeAmount)
        ? b.platformFeeAmount
        : platformFeeAudDollars(gross);
    let providerShare = Math.round((gross - platformCommission) * 100) / 100;
    let estimatedStripe = estimateStripeProcessingFeeAud(gross);

    if (b.status === 'cancelled' && cancelKind === 'unpaid') {
      platformCommission = 0;
      providerShare = 0;
      estimatedStripe = 0;
    }

    const space = spaceById.get(b.spaceId.toHexString());
    const consumer = userById.get(b.consumerId.toHexString());

    const relevant =
      b.status === 'confirmed' ?
        b.updatedAt
      : b.status === 'pending_payment' ?
        b.createdAt
      : (b.cancelledAt ?? b.updatedAt);

    return {
      bookingId: b._id!.toHexString(),
      bookingStatus: b.status,
      cancelKind,
      relevantAt: relevant.toISOString(),
      paidAt: relevant.toISOString(),
      spaceTitle: space?.title?.trim() || '—',
      consumerName: consumer?.fullName?.trim() || '—',
      grossAud: gross,
      platformCommissionAud: platformCommission,
      providerShareAud: providerShare,
      estimatedStripeFeeAud: estimatedStripe,
      stripeCheckoutSessionId: b.stripeCheckoutSessionId ?? null,
      currency: b.currency,
    };
  });
}
