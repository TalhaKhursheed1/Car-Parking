import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { platformApplicationFeeCents } from '@/lib/stripe/fees';
import { getAppBaseUrl } from '@/lib/stripe/app-base-url';
import { createBookingCheckoutSession } from '@/lib/stripe/createBookingCheckoutSession';
import { getStripe } from '@/lib/stripe/server';
import {
  expirePendingBookingsPastDue,
  findBookingById,
  setBookingStripeCheckoutSession,
} from '@/lib/repositories/bookings';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import { findSpacesByIds } from '@/lib/repositories/spaces';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Only consumers can pay for bookings' }, { status: 403 });
  }

  const { id: bookingId } = await context.params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
  }

  await expirePendingBookingsPastDue();

  let consumerObjectId: ObjectId;
  try {
    consumerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const booking = await findBookingById(bookingId);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (!booking.consumerId.equals(consumerObjectId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (booking.status !== 'pending_payment') {
    return NextResponse.json({ error: 'This booking is not awaiting payment' }, { status: 400 });
  }

  const currency = booking.currency.toLowerCase();
  if (currency !== 'aud') {
    return NextResponse.json({ error: 'Only AUD payments are supported' }, { status: 400 });
  }

  const providerProfile = await findProviderProfileByUserId(booking.providerId);
  const connectId = providerProfile?.stripeConnectAccountId?.trim();
  if (!connectId) {
    return NextResponse.json(
      { error: 'The host has not finished payment setup yet. Try again later.' },
      { status: 409 },
    );
  }

  const stripe = getStripe();
  let chargesEnabled = providerProfile?.stripeConnectChargesEnabled === true;
  if (!chargesEnabled) {
    try {
      const acct = await stripe.accounts.retrieve(connectId);
      chargesEnabled = acct.charges_enabled === true;
    } catch (e) {
      console.error('Stripe retrieve account failed', e);
      return NextResponse.json({ error: 'Could not verify host payout account' }, { status: 502 });
    }
  }
  if (!chargesEnabled) {
    return NextResponse.json(
      { error: 'The host cannot accept card payments until Stripe onboarding is complete.' },
      { status: 409 },
    );
  }

  const spaces = await findSpacesByIds([booking.spaceId]);
  const spaceTitle = spaces[0]?.title ?? 'Parking space';

  const applicationFeeCents = platformApplicationFeeCents(booking.totalAmount);
  const unitCents = Math.round(booking.totalAmount * 100);
  if (applicationFeeCents >= unitCents) {
    return NextResponse.json({ error: 'Invalid fee configuration' }, { status: 500 });
  }

  const baseUrl = getAppBaseUrl();

  const paymentDueIso = booking.paymentDueAt ? booking.paymentDueAt.toISOString() : null;

  try {
    const existingSessionId = booking.stripeCheckoutSessionId?.trim();
    if (existingSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(existingSessionId);
        const exp = existing.expires_at;
        const stillOpen = existing.status === 'open' && existing.url;
        const notExpired = exp == null || exp > Math.floor(Date.now() / 1000);
        if (stillOpen && notExpired && existing.url) {
          return NextResponse.json({
            url: existing.url,
            expiresAt: exp,
            paymentDueAt: paymentDueIso,
            reusedSession: true,
          });
        }
      } catch {
        // Fall through and create a new Checkout Session
      }
    }

    const checkoutSession = await createBookingCheckoutSession({
      booking,
      spaceTitle,
      destinationAccountId: connectId,
      applicationFeeCents,
      baseUrl,
    });

    await setBookingStripeCheckoutSession(bookingId, consumerObjectId, checkoutSession.id);

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Checkout session missing redirect URL' }, { status: 502 });
    }

    return NextResponse.json({
      url: checkoutSession.url,
      expiresAt: checkoutSession.expiresAt,
      paymentDueAt: paymentDueIso,
      reusedSession: false,
    });
  } catch (err) {
    console.error('Checkout session creation failed', err);
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
