'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthGuard } from '@/components/AuthGuard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useLogout } from '@/features/auth/hooks';
import type { ProviderEarningsReportFilter, ProviderEarningsRow } from '@/features/provider/api';
import { useProviderProfile, useProviderEarnings } from '@/features/provider/hooks';

const FILTER_OPTIONS: { value: ProviderEarningsReportFilter; label: string }[] = [
  { value: 'paid', label: 'Paid (completed)' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'cancelled', label: 'Cancelled (all)' },
  { value: 'cancelled_unpaid', label: 'Cancelled · before payment' },
  { value: 'cancelled_paid', label: 'Cancelled · after payment' },
  { value: 'all', label: 'All statuses' },
];

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatPaidAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function dateColumnTitle(f: ProviderEarningsReportFilter): string {
  switch (f) {
    case 'paid':
      return 'Paid (approx.)';
    case 'pending':
      return 'Booked';
    case 'cancelled':
    case 'cancelled_unpaid':
    case 'cancelled_paid':
      return 'Cancelled / end';
    case 'all':
      return 'Relevant date';
    default:
      return 'Date';
  }
}

function rowStatusLabel(row: ProviderEarningsRow): string {
  if (row.bookingStatus === 'confirmed') {
    return 'Paid';
  }
  if (row.bookingStatus === 'pending_payment') {
    return 'Pending payment';
  }
  if (row.cancelKind === 'unpaid') {
    return 'Cancelled (no payment)';
  }
  if (row.cancelKind === 'after_payment') {
    return 'Cancelled (after payment)';
  }
  return 'Cancelled';
}

function emptyTableCopy(f: ProviderEarningsReportFilter): string {
  switch (f) {
    case 'paid':
      return 'No paid bookings in this range.';
    case 'pending':
      return 'No pending-payment bookings in this range.';
    case 'cancelled':
      return 'No cancelled bookings in this range.';
    case 'cancelled_unpaid':
      return 'No unpaid cancellations in this range.';
    case 'cancelled_paid':
      return 'No paid-then-cancelled bookings in this range.';
    case 'all':
      return 'No bookings in this range for any status.';
    default:
      return 'No rows in this range.';
  }
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 89);
  const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
  return { from: fromStr, to: toStr };
}

export default function ProviderEarningsPage() {
  const router = useRouter();
  const logoutMutation = useLogout();
  const { data: profileData, isLoading, isError } = useProviderProfile();
  const profileStatus = profileData?.profile.status;

  const initial = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedFilter, setAppliedFilter] = useState<ProviderEarningsReportFilter>('paid');

  const earningsEnabled = Boolean(profileStatus === 'approved');
  const { data: income, isLoading: loadingIncome, isError: incomeError, error, refetch, isFetching } =
    useProviderEarnings(appliedFrom, appliedTo, earningsEnabled, appliedFilter);

  const setFromDate = (next: string) => {
    setFrom(next);
    if (next && to && next > to) {
      setTo(next);
    }
  };

  const setToDate = (next: string) => {
    if (!next) {
      setTo('');
      return;
    }
    if (from && next < from) {
      setTo(from);
      return;
    }
    setTo(next);
  };

  const applyRange = () => {
    if (from && to && from > to) {
      return;
    }
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const rangeInvalid = Boolean(from && to && from > to);

  return (
    <AuthGuard allowedRoles={['provider']}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading your provider account...
        </div>
      ) : isError || !profileStatus ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load provider profile. Please try again later.
        </div>
      ) : profileStatus !== 'approved' ? (
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => router.push('/'),
            })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      ) : (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full text-white">
          <div className="mb-8 sm:mb-12">
            <Link
              href="/provider/dashboard"
              className="inline-flex items-center text-white mb-4 transition-colors hover:underline"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">Earnings</h1>
            <p className="text-base sm:text-lg text-white">
              Filter by payment status. Paid rows use the time payment completed (booking update). Pending uses
              booking created time. Cancelled uses cancellation time. Payouts and balances are managed in Stripe.
            </p>
          </div>

          <Card className="p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end flex-wrap" style={{ gap: '1rem' }}>
              <div className="flex flex-col min-w-[14rem]" style={{ gap: '0.5rem' }}>
                <label htmlFor="earnings-filter" className="block text-xs uppercase tracking-wide text-white">
                  Booking status
                </label>
                <select
                  id="earnings-filter"
                  value={appliedFilter}
                  onChange={(e) => setAppliedFilter(e.target.value as ProviderEarningsReportFilter)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                >
                  {FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-900">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                <label htmlFor="earnings-from" className="block text-xs uppercase tracking-wide text-white">
                  From
                </label>
                <input
                  id="earnings-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                />
              </div>
              <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                <label htmlFor="earnings-to" className="block text-xs uppercase tracking-wide text-white">
                  To
                </label>
                <input
                  id="earnings-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                />
              </div>
              <Button type="button" onClick={applyRange} disabled={isFetching || rangeInvalid}>
                {isFetching ? 'Loading…' : 'Apply range'}
              </Button>
            </div>
            {rangeInvalid && (
              <p className="text-sm text-white mt-3" role="alert">
                &quot;To&quot; must be on or after &quot;From&quot;.
              </p>
            )}
            {income?.range && (
              <p className="text-xs text-white mt-4">
                Server range (UTC):{' '}
                {income.range.from ? new Date(income.range.from).toISOString().slice(0, 10) : '—'} —{' '}
                {income.range.to ? new Date(income.range.to).toISOString().slice(0, 10) : '—'}
              </p>
            )}
          </Card>

          {loadingIncome && <p className="text-white">Loading earnings…</p>}

          {incomeError && (
            <Card className="p-6 border-red-500/40">
              <p className="text-white">{error instanceof Error ? error.message : 'Failed to load'}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </Card>
          )}

          {income && !loadingIncome && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4" style={{ gap: '1rem' }}>
                <Card className="p-5">
                  <p className="text-xs uppercase text-white mb-1">Gross (customer paid)</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(income.totals.grossAud, 'AUD')}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs uppercase text-white mb-1">Platform fee</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(income.totals.platformCommissionAud, 'AUD')}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs uppercase text-white mb-1">Your share</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(income.totals.providerShareAud, 'AUD')}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs uppercase text-white mb-1">Est. Stripe fees</p>
                  <p className="text-sm text-white">{formatCurrency(income.totals.estimatedStripeFeeAud, 'AUD')}</p>
                  <p className="text-xs text-white mt-1">Rough estimate; actual fees vary.</p>
                </Card>
              </div>
              <p className="text-sm text-white/85 mb-8">{income.totalsHint}</p>

              <Card className="p-0 w-full max-w-full" style={{ padding: 0, overflow: 'visible' }}>
                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-gutter:stable]">
                  <table className="w-full min-w-[64rem] text-left text-base sm:text-[1.05rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">
                          {dateColumnTitle(income.filter)}
                        </th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">Status</th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white">Space</th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white">Customer</th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                          Gross
                        </th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                          Platform
                        </th>
                        <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                          Your share
                        </th>
                        <th className="min-w-[22rem] px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">
                          Stripe session
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 sm:px-6 py-12 text-center text-white text-lg">
                            {emptyTableCopy(income.filter)}
                          </td>
                        </tr>
                      ) : (
                        income.rows.map((row) => (
                          <tr key={row.bookingId} className="border-b border-white/5 hover:bg-white/[0.06]">
                            <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap">
                              {formatPaidAt(row.relevantAt)}
                            </td>
                            <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap text-sm">
                              {rowStatusLabel(row)}
                            </td>
                            <td className="px-5 sm:px-6 py-4 text-white min-w-[10rem] max-w-[18rem]">
                              {row.spaceTitle}
                            </td>
                            <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap">{row.consumerName}</td>
                            <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                              {formatCurrency(row.grossAud, row.currency)}
                            </td>
                            <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                              {formatCurrency(row.platformCommissionAud, row.currency)}
                            </td>
                            <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                              {formatCurrency(row.providerShareAud, row.currency)}
                            </td>
                            <td className="min-w-[22rem] px-5 sm:px-6 py-4 text-white font-mono text-sm sm:text-[0.95rem] whitespace-nowrap">
                              {row.stripeCheckoutSessionId ? (
                                <span className="select-all" title={row.stripeCheckoutSessionId}>
                                  {row.stripeCheckoutSessionId}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {income.rows.length > 0 && (
                      <tfoot>
                        <tr className="bg-white/10 font-semibold text-base sm:text-[1.05rem]">
                          <td colSpan={4} className="px-5 sm:px-6 py-4 text-white">
                            Totals
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                            {formatCurrency(income.totals.grossAud, 'AUD')}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                            {formatCurrency(income.totals.platformCommissionAud, 'AUD')}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                            {formatCurrency(income.totals.providerShareAud, 'AUD')}
                          </td>
                          <td className="px-5 sm:px-6 py-4 min-w-[22rem]" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <p className="px-5 sm:px-6 py-3 text-xs sm:text-sm text-white border-t border-white/10">
                  Scroll horizontally if columns or Stripe IDs do not fit on screen.
                </p>
              </Card>
            </>
          )}
        </div>
      )}
    </AuthGuard>
  );
}
