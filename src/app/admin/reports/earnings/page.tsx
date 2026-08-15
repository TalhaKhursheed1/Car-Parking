'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import {
  buildEarningsCsvUrl,
  type EarningsGroupBy,
} from '@/features/admin/earnings/api';
import { useAdminEarningsReport } from '@/features/admin/earnings/hooks';

function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
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

const GROUP_OPTIONS: Array<{ value: EarningsGroupBy; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week (ISO)' },
  { value: 'month', label: 'Month' },
  { value: 'provider', label: 'Provider' },
  { value: 'city', label: 'City' },
];

function HeaderLabel({ groupBy }: { groupBy: EarningsGroupBy }) {
  if (groupBy === 'day') return <>Date</>;
  if (groupBy === 'week') return <>Week</>;
  if (groupBy === 'month') return <>Month</>;
  if (groupBy === 'provider') return <>Provider</>;
  return <>City</>;
}

function AdminEarningsPageContent() {
  const initial = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupBy, setGroupBy] = useState<EarningsGroupBy>('day');
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [appliedGroupBy, setAppliedGroupBy] = useState<EarningsGroupBy>('day');

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminEarningsReport({
      from: appliedFrom,
      to: appliedTo,
      groupBy: appliedGroupBy,
    });

  const setFromDate = (next: string) => {
    setFrom(next);
    if (next && to && next > to) setTo(next);
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

  const rangeInvalid = Boolean(from && to && from > to);

  const apply = () => {
    if (rangeInvalid) return;
    setAppliedFrom(from);
    setAppliedTo(to);
    setAppliedGroupBy(groupBy);
  };

  const csvUrl = buildEarningsCsvUrl(
    { from: appliedFrom, to: appliedTo, groupBy: appliedGroupBy },
    'csv',
  );
  const csvDetailedUrl = buildEarningsCsvUrl(
    { from: appliedFrom, to: appliedTo, groupBy: appliedGroupBy },
    'csv-detailed',
  );

  const maxGross = useMemo(() => {
    if (!data || data.rows.length === 0) return 0;
    return data.rows.reduce((m, r) => (r.grossAud > m ? r.grossAud : m), 0);
  }, [data]);

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full text-white">
      <div className="mb-8 sm:mb-12">
        <Link
          href="/admin/reports"
          className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
        >
          ← Back to Reports
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          Earnings report
        </h1>
        <p className="text-base sm:text-lg text-white/70">
          Confirmed payments grouped by your chosen dimension. Numbers update when you
          press <span className="text-white">Apply</span>.
        </p>
      </div>

      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '1rem' }}>
          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <label htmlFor="earnings-from" className="block text-xs uppercase tracking-wide text-white/70">
              From
            </label>
            <input
              id="earnings-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-white/20 px-3 py-2 text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <label htmlFor="earnings-to" className="block text-xs uppercase tracking-wide text-white/70">
              To
            </label>
            <input
              id="earnings-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-white/20 px-3 py-2 text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <label htmlFor="earnings-group" className="block text-xs uppercase tracking-wide text-white/70">
              Group by
            </label>
            <select
              id="earnings-group"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as EarningsGroupBy)}
              className="rounded-lg border border-white/20 px-3 py-2 text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end" style={{ gap: '0.5rem' }}>
            <Button type="button" onClick={apply} disabled={rangeInvalid || isFetching}>
              {isFetching ? 'Loading…' : 'Apply'}
            </Button>
          </div>
        </div>
        {rangeInvalid ? (
          <p className="text-sm text-amber-300 mt-3" role="alert">
            &quot;To&quot; must be on or after &quot;From&quot;.
          </p>
        ) : null}
      </Card>

      {isLoading ? <p className="text-white">Loading earnings…</p> : null}

      {isError ? (
        <Card className="p-6 border-red-500/40">
          <p className="text-white">{error instanceof Error ? error.message : 'Failed to load'}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {data && !isLoading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8" style={{ gap: '1rem' }}>
            <Card className="p-5">
              <p className="text-xs uppercase text-white/60 mb-1">Bookings</p>
              <p className="text-2xl font-bold text-white">{data.totals.bookings}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-white/60 mb-1">Gross revenue</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.totals.grossAud)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-white/60 mb-1">Platform commission</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.totals.platformCommissionAud)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs uppercase text-white/60 mb-1">Net to providers</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data.totals.providerShareAud)}
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center mb-4" style={{ gap: '0.75rem' }}>
            <a
              href={csvUrl}
              className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              Download CSV (grouped)
            </a>
            <a
              href={csvDetailedUrl}
              className="inline-flex items-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Download CSV (per booking)
            </a>
            <p className="text-xs text-white/60">
              {data.bookingCount} booking{data.bookingCount === 1 ? '' : 's'} in range
              {data.range.from && data.range.to ? (
                <>
                  {' '}
                  ({new Date(data.range.from).toISOString().slice(0, 10)} —{' '}
                  {new Date(data.range.to).toISOString().slice(0, 10)} UTC)
                </>
              ) : null}
            </p>
          </div>

          <Card className="p-0 w-full max-w-full" style={{ padding: 0, overflow: 'visible' }}>
            <div className="w-full max-w-full overflow-x-auto rounded-xl [scrollbar-gutter:stable]">
              <table className="w-full min-w-[56rem] text-left text-base border-separate border-spacing-0">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white whitespace-nowrap">
                      <HeaderLabel groupBy={appliedGroupBy} />
                    </th>
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Bookings</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Gross</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Platform</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">To providers</th>
                    <th className="px-5 sm:px-6 py-4 font-semibold text-white min-w-[14rem]">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 sm:px-6 py-12 text-center text-white text-lg">
                        No confirmed earnings in this range.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row) => {
                      const widthPct =
                        maxGross > 0 ? Math.max(2, Math.round((row.grossAud / maxGross) * 100)) : 0;
                      return (
                        <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.06]">
                          <td className="px-5 sm:px-6 py-4 text-white">{row.label}</td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {row.bookings}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.grossAud)}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.platformCommissionAud)}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.providerShareAud)}
                          </td>
                          <td className="px-5 sm:px-6 py-4 min-w-[14rem]">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400"
                              style={{ width: `${widthPct}%` }}
                              aria-hidden
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {data.rows.length > 0 ? (
                  <tfoot>
                    <tr className="bg-white/10 font-semibold">
                      <td className="px-5 sm:px-6 py-4 text-white">Totals</td>
                      <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                        {data.totals.bookings}
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                        {formatCurrency(data.totals.grossAud)}
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                        {formatCurrency(data.totals.platformCommissionAud)}
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                        {formatCurrency(data.totals.providerShareAud)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default function AdminEarningsReportPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminEarningsPageContent />
    </AuthGuard>
  );
}
