'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useConsumerBookings, useCancelConsumerBooking } from '@/features/bookings/hooks';
import type { ConsumerBookingRow } from '@/features/bookings/api';
import { AuthGuard } from '@/components/AuthGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Calendar, Clock, MapPin, Search, AlertCircle, Receipt, ArrowRight, History } from 'lucide-react';

/**
 * Filter for active/upcoming bookings:
 *   - Must be 'confirmed'
 *   - End time is strictly in the future relative to `now`
 */
function isUpcomingRow(b: ConsumerBookingRow, now: number): boolean {
  if (b.status === 'confirmed') {
    return new Date(b.endAt).getTime() > now;
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

function dateLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ConsumerBookingsContent() {
  const { data: allBookings, isLoading, isError } = useConsumerBookings();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const cancelMutation = useCancelConsumerBooking();

  const activeBookings = useMemo(() => {
    if (!allBookings) return [];
    // eslint-disable-next-line react-hooks/purity -- safe client-side calculation
    const now = Date.now();
    return allBookings
      .filter((b) => isUpcomingRow(b, now))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [allBookings]);

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    setCancellingId(id);
    try {
      await cancelMutation.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-screen py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full relative">
      <div className="max-w-5xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight">My Bookings</h1>
            <p className="text-muted text-base sm:text-lg max-w-2xl leading-relaxed">
              Manage your upcoming parking reservations. Need to check a past trip? Visit your history.
            </p>
          </div>
          <Link href="/consumer/bookings/history">
            <Button variant="outline" className="shrink-0 flex items-center gap-2">
              <History className="h-4 w-4" aria-hidden />
              Booking History
            </Button>
          </Link>
        </header>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card h-48 animate-pulse bg-white/5 rounded-2xl"></div>
            <div className="glass-card h-48 animate-pulse bg-white/5 rounded-2xl"></div>
          </div>
        ) : isError ? (
          <div className="glass-card border-red-500/20 bg-red-500/10 p-6 flex items-start gap-4 text-red-400">
            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold">Failed to load bookings</h3>
              <p className="mt-1">We couldn&apos;t load your active bookings. Please refresh the page to try again.</p>
            </div>
          </div>
        ) : activeBookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-muted border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Search className="h-10 w-10" strokeWidth={1.5} aria-hidden />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">No upcoming bookings</h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">
              You don&apos;t have any active parking reservations at the moment. When you book a space, it will appear here.
            </p>
            <Link href="/spaces">
              <Button size="lg" className="px-8 py-3">Find a parking space</Button>
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBookings.map((b) => {
              const isCancelling = cancellingId === b.id;
              // eslint-disable-next-line react-hooks/purity
              const isNow = Date.now() >= new Date(b.startAt).getTime() && Date.now() <= new Date(b.endAt).getTime();

              return (
                <li key={b.id}>
                  <Card className="h-full flex flex-col p-6 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        {isNow && (
                          <span className="inline-block px-2.5 py-1 bg-secondary/20 text-secondary border border-secondary/30 rounded-md text-xs font-bold uppercase tracking-wider mb-3">
                            Active Now
                          </span>
                        )}
                        <h2 className="text-xl font-bold text-foreground line-clamp-1">{b.spaceTitle}</h2>
                        <p className="text-xs font-mono text-muted mt-1 break-all uppercase">ID: {b.id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-foreground">
                          {formatMoney(b.totalAmount, b.currency)}
                        </p>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-1">Total</p>
                      </div>
                    </div>

                    <div className="flex-grow py-4 border-y border-white/10" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <p className="text-sm font-bold text-foreground">{dateLabel(b.startAt)}</p>
                          {dateLabel(b.startAt) !== dateLabel(b.endAt) && (
                            <p className="text-sm font-medium text-muted">to {dateLabel(b.endAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-secondary shrink-0 mt-0.5" aria-hidden />
                        <div className="flex items-center text-sm font-bold text-foreground">
                          {timeLabel(b.startAt)}
                          <ArrowRight className="h-3 w-3 mx-2 text-muted" aria-hidden />
                          {timeLabel(b.endAt)}
                        </div>
                      </div>
                      {/* Optional: Add location/address if available from API */}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center" style={{ gap: '0.75rem' }}>
                      <Link href={`/spaces/${b.spaceId}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-center">View Space</Button>
                      </Link>
                      
                      {b.status === 'confirmed' && (
                        <a
                          href={`/api/consumer/invoices/${encodeURIComponent(b.id)}/pdf`}
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full justify-center bg-white/5 border-white/20">
                            <Receipt className="h-4 w-4 mr-2" aria-hidden />
                            Invoice
                          </Button>
                        </a>
                      )}

                      <div className="w-full" style={{ marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleCancel(b.id)}
                          disabled={isCancelling}
                          className="w-full text-sm font-bold transition-colors disabled:opacity-50"
                          style={{
                            padding: '0.625rem',
                            backgroundColor: 'rgba(248, 113, 113, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            borderRadius: '0.75rem',
                            cursor: isCancelling ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ConsumerBookingsPage() {
  return (
    <AuthGuard allowedRoles={['consumer']}>
      <ConsumerBookingsContent />
    </AuthGuard>
  );
}
