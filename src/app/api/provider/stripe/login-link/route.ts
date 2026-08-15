import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { getStripe } from '@/lib/stripe/server';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';

type SessionPayload = {
  user?: { id?: string; role?: string };
};

/**
 * Mints a Stripe Express dashboard login link so the provider can
 * manage their bank account, payout schedule, and verification info
 * directly inside Stripe's hosted UI. We never see or store the actual
 * bank account number — Stripe is the source of truth.
 */
export async function POST(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || role !== 'provider') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let userObjectId: ObjectId;
  try {
    userObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const profile = await findProviderProfileByUserId(userObjectId);
  if (!profile) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
  }
  const accountId = profile.stripeConnectAccountId?.trim();
  if (!accountId) {
    return NextResponse.json(
      { error: 'Connect a Stripe payouts account before opening the Stripe dashboard.' },
      { status: 400 },
    );
  }
  if (profile.stripeConnectDetailsSubmitted !== true) {
    return NextResponse.json(
      { error: 'Finish Stripe onboarding before opening the express dashboard.' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(accountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error('Failed to create Stripe login link', err);
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
