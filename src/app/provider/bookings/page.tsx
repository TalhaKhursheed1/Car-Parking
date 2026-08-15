'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';

import 'react-day-picker/style.css';

import { AuthGuard } from '@/components/AuthGuard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useLogout } from '@/features/auth/hooks';
import { useProviderProfile, useProviderBookings } from '@/features/provider/hooks';
import type { ProviderBookingRow } from '@/features/provider/api';

type FilterTab = 'all' | 'active' | 'upcoming' | 'completed' | 'cancelled';

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function bookingTouchesLocalDay(startAt: string, endAt: string, day: Date): boolean {
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  const dayStart = startOfLocalDay(day).getTime();
  const dayEnd = dayStart + 86400000;
  return s < dayEnd && e > dayStart;
}

function bookingInLocalMonth(startAt: string, endAt: string, monthAnchor: Date): boolean {
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  return s < monthEnd.getTime() && e > monthStart.getTime();
}

function lifecycleBucket(
  now: number,
  startAt: string,
  endAt: string,
  status: ProviderBookingRow['status'],
): 'cancelled' | 'active' | 'upcoming' | 'completed' {
  if (status === 'cancelled') return 'cancelled';
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  if (now < s) return 'upcoming';
  if (now >= s && now < e) return 'active';
  return 'completed';
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function statusLabel(status: ProviderBookingRow['status']) {
  switch (status) {
    case 'pending_payment':
      return 'Pending payment';
    case 'confirmed':
      return 'Confirmed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function bucketBadgeStyle(bucket: 'active' | 'upcoming' | 'completed' | 'cancelled'): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
  };
  switch (bucket) {
    case 'active':
      return {
        ...base,
        backgroundColor: 'rgba(16, 185, 129, 0.22)',
        color: '#ffffff',
        border: '1px solid rgba(52, 211, 153, 0.45)',
      };
    case 'upcoming':
      return {
        ...base,
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        color: '#ffffff',
        border: '1px solid rgba(56, 189, 248, 0.45)',
      };
    case 'completed':
      return {
        ...base,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.22)',
      };
    case 'cancelled':
      return {
        ...base,
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        color: '#ffffff',
        border: '1px solid rgba(248, 113, 113, 0.4)',
      };
    default:
      return {
        ...base,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      };
  }
}

export default function ProviderBookingsPage() {
  const router = useRouter();
  const { data: profileData, isLoading: profileLoading, isError: profileError } = useProviderProfile();
  const profileStatus = profileData?.profile.status;
  const approved = profileStatus === 'approved';

  const bookingsQuery = useProviderBookings(approved);
  const bookings = bookingsQuery.data ?? [];

  const [visibleMonth, setVisibleMonth] = useState(() => startOfLocalDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const logoutMutation = useLogout();

  const datesWithBookings = useMemo(() => {
    const y = visibleMonth.getFullYear();
    const m = visibleMonth.getMonth();
    const out: Date[] = [];
    for (let dom = 1; dom <= 31; dom += 1) {
      const day = new Date(y, m, dom);
      if (day.getMonth() !== m) break;
      if (bookings.some((b) => bookingTouchesLocalDay(b.startAt, b.endAt, day))) {
        out.push(day);
      }
    }
    return out;
  }, [bookings, visibleMonth]);

  const filteredBookings = useMemo(() => {
    const tick = Date.now();
    return bookings
      .filter((b) => bookingInLocalMonth(b.startAt, b.endAt, visibleMonth))
      .filter((b) => {
        if (selectedDay && !bookingTouchesLocalDay(b.startAt, b.endAt, selectedDay)) {
          return false;
        }
        const life = lifecycleBucket(tick, b.startAt, b.endAt, b.status);
        if (filterTab === 'all') return true;
        if (filterTab === 'active') return life === 'active';
        if (filterTab === 'upcoming') return life === 'upcoming';
        if (filterTab === 'completed') return life === 'completed';
        if (filterTab === 'cancelled') return life === 'cancelled';
        return true;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, visibleMonth, selectedDay, filterTab]);

  return (
    <AuthGuard allowedRoles={['provider']}>
      {profileLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>
      ) : profileError || !profileStatus ? (
        <div className="min-h-screen flex items-center justify-center text-white">
          Unable to load provider profile.
        </div>
      ) : !approved ? (
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => router.push('/'),
            })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      ) : (
        <div className="min-h-screen py-8 sm:py-12 px-6 sm:px-8 lg:px-12 xl:px-16 w-full max-w-6xl mx-auto text-white" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/provider/dashboard"
                className="inline-block text-sm text-white mb-2 transition-colors hover:underline"
              >
                ← Back to dashboard
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Bookings</h1>
              <p className="text-white mt-1 text-base">
                Calendar and schedule for your spaces. Click a day to filter the list; use tabs for active,
                upcoming, completed, and cancelled.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter bookings">
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['upcoming', 'Upcoming'],
                ['completed', 'Completed'],
                ['cancelled', 'Cancelled'],
              ] as const
            ).map(([key, label]) => {
              const selected = filterTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilterTab(key)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#ffffff',
                    border: selected
                      ? '1px solid rgba(147, 197, 253, 0.65)'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                    backgroundColor: selected ? 'rgba(37, 99, 235, 0.85)' : 'rgba(255, 255, 255, 0.06)',
                    boxShadow: selected ? '0 0 0 1px rgba(37, 99, 235, 0.35)' : undefined,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '2rem' }}>
            <Card className="p-4 sm:p-6 border-white/10 bg-white/5 space-booking-calendar">
              <h2 className="text-lg font-semibold mb-4 text-white">Month view</h2>
              <DayPicker
                mode="single"
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
                selected={selectedDay}
                onSelect={(d) => {
                  setSelectedDay(d);
                }}
                modifiers={{ hasBooking: datesWithBookings }}
                modifiersClassNames={{
                  hasBooking: 'provider-cal-has-booking',
                }}
                disabled={{ before: startOfLocalDay(new Date(2020, 0, 1)) }}
                className="mx-auto"
              />
              {selectedDay ? (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-white/70">
                    Filtering: {selectedDay.toLocaleDateString('en-AU')}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDay(undefined)}>
                    Clear day
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-white mt-3">Tip: select a day to narrow the list.</p>
              )}
            </Card>

            <Card className="p-4 sm:p-6 border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white mb-2">
                {visibleMonth.toLocaleString('en-AU', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-sm text-white mb-4">
                {filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'} in view
              </p>
              {bookingsQuery.isLoading ? (
                <p className="text-white text-sm">Loading bookings…</p>
              ) : bookingsQuery.isError ? (
                <p className="text-white text-sm">Could not load bookings.</p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-white text-sm">No bookings match this view.</p>
              ) : (
                <ul className="max-h-[480px] overflow-y-auto pr-1" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredBookings.map((b) => {
                    const life = lifecycleBucket(Date.now(), b.startAt, b.endAt, b.status);
                    return (
                      <li
                        key={b.id}
                        className="rounded-lg border border-white/10 bg-black/20 p-4"
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">{b.spaceTitle}</p>
                            <p className="text-sm text-white">{b.consumerName}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            <span style={bucketBadgeStyle(life)}>
                              {life === 'cancelled' ? 'Cancelled' : life}
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              }}
                            >
                              {statusLabel(b.status)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-white">
                          {new Date(b.startAt).toLocaleString('en-AU', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          →{' '}
                          {new Date(b.endAt).toLocaleString('en-AU', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        <p className="text-sm text-white/60">
                          {formatMoney(b.totalAmount, b.currency)} · {b.pricingMode}
                        </p>
                        {b.payment && (
                          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <p className="text-white font-medium">Payment received</p>
                            <p>
                              Paid (approx.):{' '}
                              {new Date(b.payment.paidAt).toLocaleString('en-AU', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                            <p>
                              Customer paid: {formatMoney(b.payment.customerTotalAud, b.currency)} · Platform fee:{' '}
                              {formatMoney(b.payment.platformFeeAud, b.currency)} · Your share:{' '}
                              <span className="text-white font-medium">
                                {formatMoney(b.payment.providerShareAud, b.currency)}
                              </span>
                            </p>
                            {b.payment.stripeCheckoutSessionId && (
                              <p className="text-white font-mono break-all">
                                Ref: {b.payment.stripeCheckoutSessionId}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
