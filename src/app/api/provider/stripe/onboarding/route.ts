import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { getAppBaseUrl } from '@/lib/stripe/app-base-url';
import { getStripe } from '@/lib/stripe/server';
import {
  ensureProviderProfileIndexes,
  findProviderProfileByUserId,
  updateProviderProfile,
} from '@/lib/repositories/providerProfiles';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

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

  await ensureProviderProfileIndexes();

  const profile = await findProviderProfileByUserId(userObjectId);
  if (!profile) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
  }
  if (profile.status !== 'approved') {
    return NextResponse.json(
      { error: 'Your provider account must be approved before connecting Stripe payouts.' },
      { status: 403 },
    );
  }

  const baseUrl = getAppBaseUrl();
  const stripe = getStripe();

  try {
    let accountId = profile.stripeConnectAccountId?.trim() || '';

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          parkspaceUserId: userId,
        },
      });
      accountId = account.id;
      await updateProviderProfile(userObjectId, {
        stripeConnectAccountId: accountId,
        stripeConnectChargesEnabled: false,
        stripeConnectPayoutsEnabled: false,
        stripeConnectDetailsSubmitted: false,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/provider/profile?stripe_refresh=1`,
      return_url: `${baseUrl}/provider/profile?stripe_return=1`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error('Stripe Connect onboarding failed', err);
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
