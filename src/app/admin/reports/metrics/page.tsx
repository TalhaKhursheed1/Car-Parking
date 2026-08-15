'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import {
  Building2,
  CheckCircle2,
  Heart,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useAdminMetrics } from '@/features/admin/metrics/hooks';

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

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
  return { from: fromStr, to: toStr };
}

type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
};

function Kpi({ label, value, hint, icon: Icon }: KpiProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-white/80" strokeWidth={1.7} aria-hidden />
        <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="text-xs text-white/60 mt-1">{hint}</p> : null}
    </Card>
  );
}

function MetricsContent() {
  const initial = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminMetrics(appliedFrom, appliedTo);

  const rangeInvalid = Boolean(from && to && from > to);
  const apply = () => {
    if (rangeInvalid) return;
    setAppliedFrom(from);
    setAppliedTo(to);
  };

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
          System metrics
        </h1>
        <p className="text-base sm:text-lg text-white/70">
          High-level KPIs and the top performers in the selected window. Catalogue counts
          (users, spaces, reviews, likes) are all-time.
        </p>
      </div>

      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1rem' }}>
          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <label htmlFor="metrics-from" className="block text-xs uppercase tracking-wide text-white/70">
              From
            </label>
            <input
              id="metrics-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-white/20 px-3 py-2 text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div className="flex flex-col" style={{ gap: '0.5rem' }}>
            <label htmlFor="metrics-to" className="block text-xs uppercase tracking-wide text-white/70">
              To
            </label>
            <input
              id="metrics-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-white/20 px-3 py-2 text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div className="flex items-end">
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

      {isLoading ? <p className="text-white">Loading metrics…</p> : null}

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
          {/* Headline KPIs */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">In the selected window</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '1rem' }}>
              <Kpi
                label="Gross revenue"
                value={formatCurrency(data.revenueInRange.grossAud)}
                hint={`${data.revenueInRange.bookings} confirmed bookings`}
                icon={CheckCircle2}
              />
              <Kpi
                label="Platform commission"
                value={formatCurrency(data.revenueInRange.platformCommissionAud)}
                hint="10% of gross"
                icon={Sparkles}
              />
              <Kpi
                label="Net to providers"
                value={formatCurrency(data.revenueInRange.providerShareAud)}
                icon={Building2}
              />
              <Kpi
                label="Conversion rate"
                value={formatPercent(data.bookings.conversionRate)}
                hint={`${data.bookings.inRange.confirmed}/${data.bookings.inRange.total} bookings confirmed`}
                icon={Users}
              />
            </div>
          </section>

          {/* Booking status breakdown */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">Booking pipeline (in range)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '1rem' }}>
              <Kpi
                label="Confirmed"
                value={String(data.bookings.inRange.confirmed)}
                icon={CheckCircle2}
              />
              <Kpi
                label="Pending payment"
                value={String(data.bookings.inRange.pendingPayment)}
                icon={Users}
              />
              <Kpi
                label="Cancelled"
                value={String(data.bookings.inRange.cancelled)}
                icon={Users}
              />
            </div>
          </section>

          {/* Catalogue overview */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">Catalogue (all-time)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '1rem' }}>
              <Kpi
                label="Users"
                value={String(data.users.total)}
                hint={`${data.users.consumer} consumers · ${data.users.provider} providers · ${data.users.admin} admins`}
                icon={Users}
              />
              <Kpi
                label="Spaces"
                value={String(data.spaces.total)}
                hint={`${data.spaces.approved} approved · ${data.spaces.pending} pending · ${data.spaces.recommended} recommended`}
                icon={Building2}
              />
              <Kpi
                label="Reviews"
                value={String(data.reviews.totalReviews)}
                hint={`Avg ★ ${data.reviews.averageRating.toFixed(1)} across ${data.reviews.reviewedSpaces} spaces`}
                icon={Star}
              />
              <Kpi
                label="Likes"
                value={String(data.likes.totalLikes)}
                hint={`${data.likes.uniqueLikers} unique consumers`}
                icon={Heart}
              />
            </div>
          </section>

          {/* Top spaces */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">
              Top spaces by revenue (in range)
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Space</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Location</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Bookings</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSpaces.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 sm:px-6 py-10 text-center text-white/80">
                          No revenue in this range yet.
                        </td>
                      </tr>
                    ) : (
                      data.topSpaces.map((row) => (
                        <tr key={row.spaceId} className="border-b border-white/5">
                          <td className="px-5 sm:px-6 py-4 text-white">
                            <Link href={`/spaces/${row.spaceId}`} className="text-blue-300 hover:underline">
                              {row.title}
                            </Link>
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-white/80">
                            {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {row.bookings}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.grossAud)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* Top providers */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">
              Top providers by revenue (in range)
            </h2>
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Provider</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white">Email</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Bookings</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Gross</th>
                      <th className="px-5 sm:px-6 py-4 font-semibold text-white text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProviders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 sm:px-6 py-10 text-center text-white/80">
                          No provider revenue in this range yet.
                        </td>
                      </tr>
                    ) : (
                      data.topProviders.map((row) => (
                        <tr key={row.providerId} className="border-b border-white/5">
                          <td className="px-5 sm:px-6 py-4 text-white">{row.fullName}</td>
                          <td className="px-5 sm:px-6 py-4 text-white/80">{row.email}</td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {row.bookings}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.grossAud)}
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right text-white tabular-nums">
                            {formatCurrency(row.netAud)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* All-time commission */}
          <section className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-4">All-time platform income</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
              <Kpi
                label="Platform commission collected"
                value={formatCurrency(data.revenueAllTime.platformCommissionAud)}
                icon={Sparkles}
              />
              <Kpi
                label="Confirmed bookings (all-time)"
                value={String(data.revenueAllTime.confirmedBookings)}
                icon={CheckCircle2}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default function AdminMetricsPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <MetricsContent />
    </AuthGuard>
  );
}
