'use client';

import { useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  useProviderStripeOnboarding,
  useProviderStripeLoginLink,
  useRefreshProviderStripe,
} from '@/features/provider/hooks';
import type { ProviderBankingSnapshot, StripeConnectSummary } from '@/features/provider/api';
import {
  Banknote,
  ExternalLink,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

type Props = {
  banking: ProviderBankingSnapshot | undefined;
  stripe: StripeConnectSummary | undefined;
};

function formatBrand(brand: string | null): string {
  if (!brand) return 'Bank account';
  return brand
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'never';
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function ProviderBankingSection({ banking, stripe }: Props) {
  const onboarding = useProviderStripeOnboarding();
  const loginLink = useProviderStripeLoginLink();
  const refresh = useRefreshProviderStripe();
  const [feedback, setFeedback] = useState<string | null>(null);

  const stripeReady = stripe?.readyForPayments === true;
  const hasAccount = stripe?.hasAccount === true;
  const last4 = banking?.last4 ?? null;
  const brand = formatBrand(banking?.brand ?? null);
  const currency = banking?.currency ?? null;

  const handleRefresh = () => {
    setFeedback(null);
    refresh.mutate(undefined, {
      onSuccess: () => setFeedback('Banking info refreshed from Stripe.'),
      onError: (err) => setFeedback(err instanceof Error ? err.message : 'Refresh failed'),
    });
  };

  return (
    <Card id="banking" className="p-6 sm:p-8 scroll-mt-24 border-white/15 bg-white/5">
      <div className="flex items-start gap-4 mb-8">
        <Banknote
          className="h-8 w-8 text-emerald-300 shrink-0 mt-0.5"
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Banking &amp; Payouts</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Your payout bank account is managed inside Stripe. Update it any time from the
            Stripe Express dashboard — we never see or store your full bank number.
          </p>
        </div>
      </div>

      {/* Status panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatusTile
          ok={stripeReady}
          okLabel="Connected & ready"
          notOkLabel={hasAccount ? 'Setup incomplete' : 'Not connected'}
          caption="Stripe Connect"
        />
        <StatusTile
          ok={stripe?.chargesEnabled === true}
          okLabel="Card payments enabled"
          notOkLabel="Payments disabled"
          caption="Charges"
        />
        <StatusTile
          ok={stripe?.payoutsEnabled === true}
          okLabel="Payouts enabled"
          notOkLabel="Payouts pending"
          caption="Payouts"
        />
      </div>

      {/* Bank account summary */}
      <div
        className="rounded-xl border border-white/10 bg-white/5 px-6 py-6 mb-8"
        aria-label="Current payout bank account"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-white/60">
              Payout bank account
            </p>
            <p className="text-lg font-semibold text-white">
              {last4 ? `${brand} •••• ${last4}` : 'No bank account on file yet'}
            </p>
            <p className="text-xs text-white/60">
              {currency ? `${currency} payouts` : 'Currency not set'} · Last synced{' '}
              {formatSyncedAt(banking?.syncedAt ?? null)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refresh.isPending || !hasAccount}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" aria-hidden />
              {refresh.isPending ? 'Refreshing…' : 'Refresh from Stripe'}
            </span>
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!hasAccount ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              onboarding.mutate();
            }}
            disabled={onboarding.isPending}
          >
            {onboarding.isPending ? 'Opening Stripe…' : 'Connect Stripe payouts'}
          </Button>
        ) : null}
        {hasAccount && !stripeReady ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              onboarding.mutate();
            }}
            disabled={onboarding.isPending}
          >
            {onboarding.isPending ? 'Opening Stripe…' : 'Resume Stripe verification'}
          </Button>
        ) : null}
        {stripeReady ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              loginLink.mutate();
            }}
            disabled={loginLink.isPending}
          >
            <span className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" aria-hidden />
              {loginLink.isPending ? 'Opening…' : 'Update bank details on Stripe'}
            </span>
          </Button>
        ) : null}
      </div>

      {/* Status messages */}
      {onboarding.isError || loginLink.isError || feedback ? (
        <div className="mt-6 space-y-2">
          {onboarding.isError ? (
            <p className="text-sm text-red-300" role="alert">
              {onboarding.error.message}
            </p>
          ) : null}
          {loginLink.isError ? (
            <p className="text-sm text-red-300" role="alert">
              {loginLink.error.message}
            </p>
          ) : null}
          {feedback ? (
            <p
              className={`text-sm ${refresh.isError ? 'text-red-300' : 'text-emerald-300'}`}
              role={refresh.isError ? 'alert' : 'status'}
            >
              {feedback}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function StatusTile({
  ok,
  okLabel,
  notOkLabel,
  caption,
}: {
  ok: boolean;
  okLabel: string;
  notOkLabel: string;
  caption: string;
}) {
  const Icon = ok ? ShieldCheck : ShieldAlert;
  const accent = ok ? 'text-emerald-300' : 'text-amber-300';
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-white/60">{caption}</p>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} aria-hidden />
        <p className={`text-sm font-semibold ${ok ? 'text-white' : 'text-amber-100'}`}>
          {ok ? okLabel : notOkLabel}
        </p>
      </div>
    </div>
  );
}
