import type { WithId } from 'mongodb';

import type { Booking } from '@/lib/repositories/bookings';
import {
  STRIPE_CHECKOUT_FALLBACK_EXPIRY_SEC,
  STRIPE_CHECKOUT_TARGET_EXPIRY_SEC,
} from '@/lib/booking/paymentDeadline';

import { getStripe } from './server';

type CheckoutSessionCreateParams = Parameters<import('stripe').Stripe['checkout']['sessions']['create']>[0];

export type CreatedCheckoutSession = {
  id: string;
  url: string | null;
  expiresAt: number | null;
};

function sessionParams(
  params: {
    booking: WithId<Booking>;
    spaceTitle: string;
    destinationAccountId: string;
    applicationFeeCents: number;
    baseUrl: string;
    expiresAtUnix: number;
  },
) {
  const { booking, spaceTitle, destinationAccountId, applicationFeeCents, baseUrl, expiresAtUnix } = params;
  const currency = booking.currency.toLowerCase();
  const unitAmount = Math.round(booking.totalAmount * 100);
  const title = `Parking — ${spaceTitle}`.slice(0, 250);

  return {
    mode: 'payment' as const,
    payment_method_types: ['card'],
    expires_at: expiresAtUnix,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: title,
            description: `Booking reference ${booking._id!.toString()}`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: destinationAccountId,
      },
      metadata: {
        bookingId: booking._id!.toString(),
      },
    },
    success_url: `${baseUrl}/consumer/bookings?checkout=success`,
    cancel_url: `${baseUrl}/consumer/bookings?checkout=cancel`,
    metadata: {
      bookingId: booking._id!.toString(),
      consumerId: booking.consumerId.toString(),
    },
  };
}

export async function createBookingCheckoutSession(params: {
  booking: WithId<Booking>;
  spaceTitle: string;
  destinationAccountId: string;
  applicationFeeCents: number;
  baseUrl: string;
}): Promise<CreatedCheckoutSession> {
  const { booking, spaceTitle, destinationAccountId, applicationFeeCents, baseUrl } = params;
  const stripe = getStripe();

  const currency = booking.currency.toLowerCase();
  if (currency !== 'aud') {
    throw new Error('Only AUD bookings are supported for checkout');
  }

  const unitAmount = Math.round(booking.totalAmount * 100);
  if (unitAmount < 50) {
    throw new Error('Amount too small for checkout');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const targetExpiry = nowSec + STRIPE_CHECKOUT_TARGET_EXPIRY_SEC;

  const baseArgs = {
    booking,
    spaceTitle,
    destinationAccountId,
    applicationFeeCents,
    baseUrl,
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      sessionParams({ ...baseArgs, expiresAtUnix: targetExpiry }) as CheckoutSessionCreateParams,
    );
  } catch (firstErr) {
    console.warn(
      '[checkout] sessions.create with short expires_at failed, retrying with Stripe minimum window',
      firstErr,
    );
    session = await stripe.checkout.sessions.create(
      sessionParams({
        ...baseArgs,
        expiresAtUnix: nowSec + STRIPE_CHECKOUT_FALLBACK_EXPIRY_SEC,
      }) as CheckoutSessionCreateParams,
    );
  }

  return {
    id: session.id,
    url: session.url,
    expiresAt: session.expires_at ?? null,
  };
}
