'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  History,
  Receipt,
  Wallet,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { AuthGuard } from '@/components/AuthGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useConsumerBookings } from '@/features/bookings/hooks';
import type { ConsumerBookingRow } from '@/features/bookings/api';

type HistoryStatusFilter = 'all' | 'completed' | 'cancelled';

function isHistoryRow(b: ConsumerBookingRow, now: number): boolean {
  if (b.status === 'cancelled') return true;
  if (b.status === 'confirmed') {
    return now >= new Date(b.endAt).getTime();
  }
  return false;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatMonthLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

function monthKey(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  } catch {
    return '0000-00';
  }
}

function dateRangeLabel(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    return `${start.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} → ${end.toLocaleString(
      'en-AU',
      { dateStyle: 'medium', timeStyle: 'short' },
    )}`;
  } catch {
    return `${startIso} → ${endIso}`;
  }
}

function statusBadge(row: ConsumerBookingRow): { label: string; tone: 'completed' | 'cancelled' } {
  if (row.status === 'cancelled') return { label: 'Cancelled', tone: 'cancelled' };
  return { label: 'Completed', tone: 'completed' };
}

function ConsumerBookingHistoryContent() {
  const { data: bookings, isLoading, isError } = useConsumerBookings(true);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const lifetimeHistory = useMemo(() => {
    if (!bookings) return [] as ConsumerBookingRow[];
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return bookings.filter((b) => isHistoryRow(b, now));
  }, [bookings]);

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let cancelled = 0;
    let spentAud = 0;
    for (const b of lifetimeHistory) {
      total += 1;
      if (b.status === 'cancelled') {
        cancelled += 1;
      } else {
        completed += 1;
        if (b.currency.toUpperCase() === 'AUD') {
          spentAud += b.totalAmount;
        }
      }
    }
    return { total, completed, cancelled, spentAud };
  }, [lifetimeHistory]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const b of lifetimeHistory) {
      try {
        set.add(String(new Date(b.startAt).getFullYear()));
      } catch {
        // ignore
      }
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [lifetimeHistory]);

  const filteredHistory = useMemo(() => {
    return lifetimeHistory
      .filter((b) => {
        if (statusFilter === 'completed') return b.status === 'confirmed';
        if (statusFilter === 'cancelled') return b.status === 'cancelled';
        return true;
      })
      .filter((b) => {
        if (yearFilter === 'all') return true;
        try {
          return String(new Date(b.startAt).getFullYear()) === yearFilter;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [lifetimeHistory, statusFilter, yearFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; rows: ConsumerBookingRow[] }>();
    for (const row of filteredHistory) {
      const key = monthKey(row.startAt);
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(key, { label: formatMonthLabel(row.startAt), rows: [row] });
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [filteredHistory]);

  return (
    <div className="min-h-screen py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full relative">
      <div className="max-w-5xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <header>
          <Link
            href="/consumer/bookings"
            className="text-sm text-primary hover:text-secondary mb-4 inline-block font-medium transition-colors"
          >
            &larr; Back to my bookings
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-primary/30">
              <History
                className="h-7 w-7 text-primary"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-2">Booking history</h1>
              <p className="text-muted text-sm sm:text-base leading-relaxed max-w-3xl">
                A record of every parking session you&apos;ve completed, plus any bookings that
                were cancelled. Use it to find an invoice or double-check what you spent.
              </p>
            </div>
          </div>
        </header>

        {/* Lifetime KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '1.5rem' }}>
          <StatTile
            icon={<CalendarClock className="h-5 w-5 text-primary" aria-hidden />}
            label="Total bookings"
            value={String(stats.total)}
            tone="neutral"
          />
          <StatTile
            icon={<CheckCircle2 className="h-5 w-5 text-secondary" aria-hidden />}
            label="Completed"
            value={String(stats.completed)}
            tone="success"
          />
          <StatTile
            icon={<XCircle className="h-5 w-5 text-red-400" aria-hidden />}
            label="Cancelled"
            value={String(stats.cancelled)}
            tone="danger"
          />
          <StatTile
            icon={<Wallet className="h-5 w-5 text-emerald-400" aria-hidden />}
            label="Total spent (AUD)"
            value={formatMoney(stats.spentAud, 'AUD')}
            tone="info"
          />
        </div>

        {/* Filters */}
        {lifetimeHistory.length > 0 && (
          <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex flex-wrap bg-black/20 p-1.5 rounded-full border border-white/5" role="tablist" style={{ gap: '0.5rem' }}>
              {(
                [
                  ['all', 'All'],
                  ['completed', 'Completed'],
                  ['cancelled', 'Cancelled'],
                ] as const
              ).map(([key, label]) => {
                const selected = statusFilter === key;
                return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setStatusFilter(key)}
                      className="text-sm font-bold transition-all"
                      style={{
                        padding: '0.5rem 1.25rem',
                        borderRadius: '9999px',
                        backgroundColor: selected ? '#7c3aed' : 'transparent',
                        color: selected ? '#ffffff' : '#a1a1aa',
                        boxShadow: selected ? '0 0 15px rgba(124, 58, 237, 0.4)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                );
              })}
            </div>

            {availableYears.length > 0 && (
              <label className="text-sm font-semibold text-muted flex items-center" style={{ gap: '0.75rem' }}>
                Year
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 text-foreground font-semibold px-4 py-2 rounded-xl focus:ring-2 focus:ring-primary outline-none [&>option]:bg-slate-900"
                >
                  <option value="all">All years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
            )}
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="p-12 text-center text-muted font-medium text-lg animate-pulse">Loading your booking history…</div>
        ) : isError ? (
          <div className="p-6 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl font-medium flex items-center gap-3">
            <AlertCircle className="h-6 w-6" /> Could not load your booking history. Please refresh and try again.
          </div>
        ) : lifetimeHistory.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <History className="h-10 w-10 text-muted" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mb-3">No past bookings yet</h3>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Once you complete a parking session or cancel a booking, it will appear here.
            </p>
            <Link href="/spaces">
              <Button size="lg" className="px-8">Find a space</Button>
            </Link>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted font-medium text-lg">
            No bookings match the current filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {grouped.map((group) => (
              <section key={group.key} aria-labelledby={`history-month-${group.key}`}>
                <h2
                  id={`history-month-${group.key}`}
                  className="text-sm font-extrabold uppercase tracking-widest text-primary mb-6 flex items-center gap-3"
                >
                  {group.label}
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  <span className="text-muted font-semibold normal-case tracking-normal">
                    {group.rows.length} {group.rows.length === 1 ? 'booking' : 'bookings'}
                  </span>
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <HistoryRow row={row} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'danger' | 'info';
}) {
  const tones: Record<typeof tone, string> = {
    neutral: 'bg-primary/10 border-primary/20',
    success: 'bg-secondary/10 border-secondary/20',
    danger: 'bg-red-500/10 border-red-500/20',
    info: 'bg-emerald-500/10 border-emerald-500/20',
  };
  
  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md ${tones[tone]}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center shadow-inner shrink-0 border border-white/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted uppercase tracking-wider truncate mb-1">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: ConsumerBookingRow }) {
  const badge = statusBadge(row);
  const isCancelled = badge.tone === 'cancelled';

  return (
    <Card className={`h-full flex flex-col p-6 hover:border-primary/50 transition-colors ${isCancelled ? 'opacity-80 grayscale-[0.2]' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <p className="font-bold text-foreground text-xl leading-tight line-clamp-1">{row.spaceTitle}</p>
          <p className="text-xs text-muted font-mono mt-1 uppercase">ID: {row.id}</p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide border ${
            isCancelled ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-secondary/10 text-secondary border-secondary/20'
          }`}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex-grow py-4 border-y border-white/10 mb-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Schedule</p>
          <p className="text-sm font-bold text-foreground">{dateRangeLabel(row.startAt, row.endAt)}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
             <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Amount Paid</p>
             <p className="text-lg font-extrabold text-foreground">{formatMoney(row.totalAmount, row.currency)}</p>
          </div>
          {isCancelled && row.cancelledAt && (
             <div className="text-right">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Cancelled</p>
                <p className="text-xs text-red-400/80 font-medium">
                  {new Date(row.cancelledAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
             </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center" style={{ gap: '0.75rem' }}>
        <Link href={`/spaces/${row.spaceId}`} className="flex-1">
          <Button variant="outline" className="w-full justify-center">
            View space
          </Button>
        </Link>
        {row.status === 'confirmed' && (
          <a
            href={`/api/consumer/invoices/${encodeURIComponent(row.id)}/pdf`}
            className="flex-1"
          >
             <Button variant="outline" className="w-full justify-center bg-white/5 border-white/20">
              <Receipt className="h-4 w-4 mr-2" aria-hidden />
              Invoice
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}

export default function ConsumerBookingHistoryPage() {
  return (
    <AuthGuard allowedRoles={['consumer']}>
      <ConsumerBookingHistoryContent />
    </AuthGuard>
  );
}
