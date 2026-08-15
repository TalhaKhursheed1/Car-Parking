'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { useAdminIncome } from '@/features/admin/income/hooks';

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

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 89);
  const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
  return { from: fromStr, to: toStr };
}

export default function AdminIncomePage() {
  const initial = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminIncome(appliedFrom, appliedTo);

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
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full text-white">
        <div className="mb-8 sm:mb-12">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-white mb-4 transition-colors hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">Income tracker</h1>
          <p className="text-base sm:text-lg text-white">
            Payments received (confirmed bookings): gross, platform commission, and net to providers. Paid time uses
            booking update time when payment completed.
          </p>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end flex-wrap" style={{ gap: '1rem' }}>
            <div className="flex flex-col" style={{ gap: '0.5rem' }}>
              <label htmlFor="income-from" className="block text-xs uppercase tracking-wide text-white">
                From
              </label>
              <input
                id="income-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-white/20 px-3 py-2 text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              />
            </div>
            <div className="flex flex-col" style={{ gap: '0.5rem' }}>
              <label htmlFor="income-to" className="block text-xs uppercase tracking-wide text-white">
                To
              </label>
              <input
                id="income-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-white/20 px-3 py-2 text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              />
            </div>
            <Button type="button" onClick={applyRange} disabled={isFetching || rangeInvalid}>
              {isFetching ? 'Loading…' : 'Apply range'}
            </Button>
          </div>
          {rangeInvalid && (
            <p className="text-sm text-white mt-3" role="alert">
              &quot;To&quot; must be on or after &quot;From&quot;. Adjust the dates or use the picker—values update
              automatically when needed.
            </p>
          )}
          {data?.range && (
            <p className="text-xs text-white mt-4">
              Server range (UTC): {data.range.from ? new Date(data.range.from).toISOString().slice(0, 10) : '—'} —{' '}
              {data.range.to ? new Date(data.range.to).toISOString().slice(0, 10) : '—'}
            </p>
          )}
        </Card>

        {isLoading && (
          <p className="text-white">Loading income data…</p>
        )}

        {isError && (
          <Card className="p-6 border-red-500/40">
            <p className="text-white">{error instanceof Error ? error.message : 'Failed to load'}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </Card>
        )}

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8" style={{ gap: '1rem' }}>
              <Card className="p-5">
                <p className="text-xs uppercase text-white mb-1">Gross (customer)</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.totals.grossAud, 'AUD')}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase text-white mb-1">Platform commission</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.totals.platformCommissionAud, 'AUD')}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase text-white mb-1">Net to providers</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(data.totals.providerShareAud, 'AUD')}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase text-white mb-1">Est. Stripe fees</p>
                <p className="text-sm text-white">{formatCurrency(data.totals.estimatedStripeFeeAud, 'AUD')}</p>
                <p className="text-xs text-white mt-1">Rough estimate; actual Stripe fees vary.</p>
              </Card>
            </div>

            <Card
              className="p-0 w-full max-w-full"
              style={{ padding: 0, overflow: 'visible' }}
            >
              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-gutter:stable]">
                <table className="w-full min-w-[72rem] text-left text-base sm:text-[1.05rem] border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">
                        Paid (approx.)
                      </th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Space</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Customer</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Provider</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                        Gross
                      </th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                        Platform
                      </th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right whitespace-nowrap">
                        To provider
                      </th>
                      <th className="min-w-[22rem] px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">
                        Stripe session
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 sm:px-6 py-12 text-center text-white text-lg">
                          No confirmed payments in this range.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((row) => (
                        <tr key={row.bookingId} className="border-b border-white/5 hover:bg-white/[0.06]">
                          <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap">
                            {formatPaidAt(row.paidAt)}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-white min-w-[10rem] max-w-[18rem]">
                            {row.spaceTitle}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap">{row.consumerName}</td>
                          <td className="px-5 sm:px-6 py-4 text-white whitespace-nowrap">{row.providerLabel}</td>
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
                  {data.rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-white/10 font-semibold text-base sm:text-[1.05rem]">
                        <td colSpan={4} className="px-5 sm:px-6 py-4 text-white">
                          Totals
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(data.totals.grossAud, 'AUD')}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(data.totals.platformCommissionAud, 'AUD')}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums whitespace-nowrap">
                          {formatCurrency(data.totals.providerShareAud, 'AUD')}
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
    </AuthGuard>
  );
}
