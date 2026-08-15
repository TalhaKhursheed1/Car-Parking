import { ObjectId, WithId } from 'mongodb';

import { estimateStripeProcessingFeeAud, platformFeeAudDollars } from '@/lib/stripe/fees';
import type { Booking } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';
import { findUsersByIds } from '@/lib/repositories/users';
import { findProviderProfilesByUserIds } from '@/lib/repositories/providerProfiles';

export type IncomeReportRow = {
  bookingId: string;
  paidAt: string;
  spaceTitle: string;
  consumerName: string;
  providerLabel: string;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
  stripeCheckoutSessionId: string | null;
  currency: string;
};

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

export async function buildIncomeReportRows(bookings: WithId<Booking>[]): Promise<IncomeReportRow[]> {
  if (bookings.length === 0) {
    return [];
  }

  const spaceIds = uniqueObjectIds(bookings.map((b) => b.spaceId));
  const consumerIds = uniqueObjectIds(bookings.map((b) => b.consumerId));
  const providerIds = uniqueObjectIds(bookings.map((b) => b.providerId));

  const [spaces, users, profiles] = await Promise.all([
    findSpacesByIds(spaceIds),
    findUsersByIds([...consumerIds, ...providerIds]),
    findProviderProfilesByUserIds(providerIds),
  ]);

  const spaceById = new Map(spaces.map((s) => [s._id!.toHexString(), s]));
  const userById = new Map(users.map((u) => [u._id!.toHexString(), u]));
  const profileByProviderId = new Map(profiles.map((p) => [p.userId.toHexString(), p]));

  return bookings.map((b) => {
    const gross = b.totalAmount;
    const platformCommission =
      b.platformFeeAmount != null && Number.isFinite(b.platformFeeAmount)
        ? b.platformFeeAmount
        : platformFeeAudDollars(gross);
    const providerShare = Math.round((gross - platformCommission) * 100) / 100;

    const space = spaceById.get(b.spaceId.toHexString());
    const consumer = userById.get(b.consumerId.toHexString());
    const providerUser = userById.get(b.providerId.toHexString());
    const profile = profileByProviderId.get(b.providerId.toHexString());

    const providerLabel =
      profile?.businessName?.trim() ||
      providerUser?.fullName?.trim() ||
      'Provider';

    return {
      bookingId: b._id!.toHexString(),
      paidAt: b.updatedAt.toISOString(),
      spaceTitle: space?.title?.trim() || '—',
      consumerName: consumer?.fullName?.trim() || '—',
      providerLabel,
      grossAud: gross,
      platformCommissionAud: platformCommission,
      providerShareAud: providerShare,
      estimatedStripeFeeAud: estimateStripeProcessingFeeAud(gross),
      stripeCheckoutSessionId: b.stripeCheckoutSessionId ?? null,
      currency: b.currency,
    };
  });
}
