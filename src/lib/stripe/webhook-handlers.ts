import { platformFeeAudDollars } from '@/lib/stripe/fees';
import {
  cancelPendingBookingIfStillAwaitingPayment,
  confirmBookingFromPaidCheckout,
  findBookingById,
} from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
} from '@/lib/notifications/consumerBookingNotifications';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';
import {
  findProviderProfileByStripeConnectAccountId,
  updateProviderProfile,
} from '@/lib/repositories/providerProfiles';
import { finalizeConsumerBookingInvoice } from '@/lib/invoices/finalizeConsumerBookingInvoice';
import { getStripe } from '@/lib/stripe/server';
import {
  persistStripeBankingSnapshot,
  summariseStripeAccount,
} from '@/lib/stripe/connectBanking';

/** Shape used from `checkout.session.completed` webhook payloads. */
export type CheckoutSessionCompletedPayload = {
  id: string;
  mode: string | null;
  payment_status: string | null;
  metadata: Record<string, string> | null;
  amount_total: number | null;
  currency: string | null;
};

export async function handleCheckoutSessionCompleted(session: CheckoutSessionCompletedPayload): Promise<void> {
  if (session.mode !== 'payment') return;
  if (session.payment_status !== 'paid') return;

  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.warn('[stripe webhook] checkout.session.completed missing bookingId in metadata');
    return;
  }

  const amountTotal = session.amount_total;
  const currency = session.currency;
  if (amountTotal == null || !currency) {
    console.warn('[stripe webhook] checkout.session.completed missing amount_total or currency');
    return;
  }

  const booking = await findBookingById(bookingId);
  if (!booking) {
    console.warn('[stripe webhook] booking not found', bookingId);
    return;
  }

  const platformFeeAud = platformFeeAudDollars(booking.totalAmount);

  const result = await confirmBookingFromPaidCheckout({
    bookingId,
    stripeCheckoutSessionId: session.id,
    amountTotalCents: amountTotal,
    currency,
    platformFeeAud,
  });

  if (!result.ok) {
    console.error('[stripe webhook] confirmBookingFromPaidCheckout', bookingId, result);
    return;
  }

  try {
    const space = await findSpaceById(booking.spaceId.toString());
    await notifyBookingConfirmed({
      bookingId,
      consumerId: booking.consumerId,
      spaceTitle: space?.title,
    });
    await recordAdminActivity({
      type: 'booking_confirmed',
      actorLabel: 'Stripe',
      actionLabel: 'Booking payment confirmed',
      contextLabel: space?.title ?? 'Parking space',
      status: 'success',
      entityId: bookingId,
    });
  } catch (err) {
    console.warn('[stripe webhook] notifyBookingConfirmed failed', bookingId, err);
  }

  try {
    await finalizeConsumerBookingInvoice(bookingId);
  } catch (err) {
    console.error('[stripe webhook] finalizeConsumerBookingInvoice', bookingId, err);
    throw err;
  }
}

export type CheckoutSessionExpiredPayload = {
  id: string;
  metadata: Record<string, string> | null;
};

/**
 * Checkout Session ran past `expires_at` without payment — release the hold (US20).
 */
export async function handleCheckoutSessionExpired(session: CheckoutSessionExpiredPayload): Promise<void> {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.warn('[stripe webhook] checkout.session.expired missing bookingId in metadata');
    return;
  }
  const booking = await findBookingById(bookingId);
  const didCancel = await cancelPendingBookingIfStillAwaitingPayment(bookingId);
  if (!didCancel || !booking) {
    return;
  }
  try {
    const space = await findSpaceById(booking.spaceId.toString());
    await notifyBookingCancelled({
      bookingId,
      consumerId: booking.consumerId,
      spaceTitle: space?.title,
      reason: 'system_expired',
    });
    await recordAdminActivity({
      type: 'booking_expired',
      actorLabel: 'Stripe',
      actionLabel: 'Booking expired before payment',
      contextLabel: space?.title ?? 'Parking space',
      status: 'warning',
      entityId: bookingId,
    });
  } catch (err) {
    console.warn('[stripe webhook] notifyBookingCancelled failed', bookingId, err);
  }
}

export type ConnectAccountPayload = {
  id: string;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
};

export async function handleAccountUpdated(account: ConnectAccountPayload): Promise<void> {
  const profile = await findProviderProfileByStripeConnectAccountId(account.id);
  if (!profile) {
    return;
  }

  // Cheap update from the webhook payload first - means we still flip
  // the toggles correctly even if the follow-up `accounts.retrieve`
  // call fails (Stripe degraded, missing key, etc.).
  await updateProviderProfile(profile.userId, {
    stripeConnectChargesEnabled: account.charges_enabled === true,
    stripeConnectPayoutsEnabled: account.payouts_enabled === true,
    stripeConnectDetailsSubmitted: account.details_submitted === true,
  });

  // Best-effort fetch of the latest external account so the provider's
  // profile shows their current bank's brand / last4 / currency. The
  // webhook payload only carries flag toggles, not the bank info.
  try {
    const stripe = getStripe();
    const fresh = await stripe.accounts.retrieve(account.id);
    const snapshot = summariseStripeAccount(fresh);
    await persistStripeBankingSnapshot(profile, snapshot);
  } catch (err) {
    console.warn('[stripe webhook] failed to refresh banking snapshot', account.id, err);
  }
}
