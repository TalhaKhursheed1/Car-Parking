import type { Stripe } from 'stripe';

import {
  updateProviderProfile,
  type ProviderProfile,
} from '@/lib/repositories/providerProfiles';

/**
 * Snapshot of Stripe-managed banking + verification info that we mirror
 * onto the local provider profile so the UI can display payout status
 * without a Stripe round-trip on every page load.
 */
export type StripeBankingSnapshot = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bankBrand: string | null;
  bankLast4: string | null;
  bankCurrency: string | null;
  bankCountry: string | null;
};

type AnyExternal = Stripe.Account['external_accounts'] extends infer T
  ? T extends { data: Array<infer D> } ? D : unknown
  : unknown;

/**
 * Picks the default external account from a Connect account. Falls
 * back to the first account if Stripe didn't flag one as default.
 */
export function pickDefaultExternalAccount(
  account: Pick<Stripe.Account, 'external_accounts'>,
): AnyExternal | null {
  const items = account.external_accounts?.data ?? [];
  if (items.length === 0) return null;
  const flagged = items.find((entry) => (entry as { default_for_currency?: boolean }).default_for_currency);
  return (flagged ?? items[0]) as AnyExternal;
}

export function summariseStripeAccount(account: Stripe.Account): StripeBankingSnapshot {
  const external = pickDefaultExternalAccount(account);
  let bankBrand: string | null = null;
  let bankLast4: string | null = null;
  let bankCurrency: string | null = null;
  let bankCountry: string | null = null;

  if (external && typeof external === 'object') {
    const entry = external as Record<string, unknown>;
    if (entry.object === 'bank_account') {
      bankBrand = typeof entry.bank_name === 'string' ? entry.bank_name : 'Bank account';
    } else if (entry.object === 'card') {
      bankBrand = typeof entry.brand === 'string' ? entry.brand : 'Card';
    }
    if (typeof entry.last4 === 'string') bankLast4 = entry.last4;
    if (typeof entry.currency === 'string') bankCurrency = entry.currency.toUpperCase();
    if (typeof entry.country === 'string') bankCountry = entry.country.toUpperCase();
  }

  return {
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    detailsSubmitted: account.details_submitted === true,
    bankBrand,
    bankLast4,
    bankCurrency,
    bankCountry,
  };
}

/**
 * Mirrors a Stripe account snapshot onto the local provider profile.
 * Safe to call from both webhook handlers and on-demand routes.
 */
export async function persistStripeBankingSnapshot(
  profile: Pick<ProviderProfile, 'userId'>,
  snapshot: StripeBankingSnapshot,
): Promise<void> {
  await updateProviderProfile(profile.userId, {
    stripeConnectChargesEnabled: snapshot.chargesEnabled,
    stripeConnectPayoutsEnabled: snapshot.payoutsEnabled,
    stripeConnectDetailsSubmitted: snapshot.detailsSubmitted,
    stripeBankBrand: snapshot.bankBrand,
    stripeBankLast4: snapshot.bankLast4,
    stripeBankCurrency: snapshot.bankCurrency,
    stripeBankCountry: snapshot.bankCountry,
    stripeBankSyncedAt: new Date(),
    // Keep the legacy field consistent so UI components that already
    // read `bankAccountLast4` continue to work after providers connect
    // a Stripe-managed bank account.
    bankAccountLast4: snapshot.bankLast4 ?? undefined,
  });
}
