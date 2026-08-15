import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripe } from '@/lib/stripe/server';
import {
  handleAccountUpdated,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
} from '@/lib/stripe/webhook-handlers';
import { releaseStripeWebhookEventClaim, tryClaimStripeWebhookEvent } from '@/lib/repositories/stripeEvents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe sends the raw body; signature verification must use the exact bytes received.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error(
      '[stripe webhook] STRIPE_WEBHOOK_SECRET is missing. Copy whsec_… from `stripe listen` into .env.local and restart `npm run dev`.',
    );
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const claimed = await tryClaimStripeWebhookEvent(event.id);
  if (!claimed) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session & Record<string, unknown>,
        );
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session & Record<string, unknown>,
        );
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account & Record<string, unknown>);
        break;
      default:
        break;
    }
  } catch (err) {
    await releaseStripeWebhookEventClaim(event.id);
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
