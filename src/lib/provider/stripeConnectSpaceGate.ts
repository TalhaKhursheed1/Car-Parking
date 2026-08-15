import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import { getStripe } from '@/lib/stripe/server';

/**
 * Blocks creating a new space until Connect can accept destination charges
 * (charges enabled + onboarding details submitted), aligned with checkout payment rules.
 */
export async function requireStripeConnectReadyForSpaceCreation(
  providerId: ObjectId,
): Promise<NextResponse | null> {
  const profile = await findProviderProfileByUserId(providerId);
  const connectId = profile?.stripeConnectAccountId?.trim();
  if (!connectId) {
    return NextResponse.json(
      {
        error:
          'Complete Stripe Connect on your profile before creating a listing. Open Profile → Payments.',
      },
      { status: 409 },
    );
  }

  let chargesEnabled = profile?.stripeConnectChargesEnabled === true;
  let detailsSubmitted = profile?.stripeConnectDetailsSubmitted === true;

  if (!chargesEnabled || !detailsSubmitted) {
    try {
      const acct = await getStripe().accounts.retrieve(connectId);
      chargesEnabled = acct.charges_enabled === true;
      detailsSubmitted = acct.details_submitted === true;
    } catch (e) {
      console.error('Stripe retrieve account failed (space create gate)', e);
      return NextResponse.json(
        { error: 'Could not verify your Stripe account. Try again later.' },
        { status: 502 },
      );
    }
  }

  if (!chargesEnabled || !detailsSubmitted) {
    return NextResponse.json(
      {
        error:
          'Finish Stripe onboarding and verification on your profile before creating a listing.',
      },
      { status: 409 },
    );
  }

  return null;
}
