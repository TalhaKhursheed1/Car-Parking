import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { getStripe } from '@/lib/stripe/server';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import {
  persistStripeBankingSnapshot,
  summariseStripeAccount,
} from '@/lib/stripe/connectBanking';

type SessionPayload = {
  user?: { id?: string; role?: string };
};

/**
 * Forces an on-demand sync of the provider's Stripe Connect account so
 * the local profile reflects the latest banking + verification info
 * without waiting for an `account.updated` webhook to arrive.
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
      { error: 'Connect a Stripe payouts account first.' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    const snapshot = summariseStripeAccount(account);
    await persistStripeBankingSnapshot(profile, snapshot);
    return NextResponse.json({
      ok: true,
      snapshot: {
        ...snapshot,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Failed to refresh Stripe Connect account', err);
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
