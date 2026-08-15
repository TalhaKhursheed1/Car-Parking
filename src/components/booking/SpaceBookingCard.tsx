'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DayPicker, type DateRange } from 'react-day-picker';

import 'react-day-picker/style.css';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { computeHourlyTotal } from '@/lib/booking/availability';
import { sydneyWallDateTimeToUtc } from '@/lib/booking/sydneyWallTime';
import { effectiveBookingCapacity } from '@/lib/booking/capacity';
import { fetchSlotAvailability } from '@/features/bookings/api';
import { useCreateBooking, useBookingCheckout } from '@/features/bookings/hooks';
import type { PublicSpaceDetail } from '@/features/spaces/hooks';

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calendar date from the picker + time as **Australia/Sydney** wall clock (matches server validation). */
function combineDateAndTime(date: Date, timeHHMM: string): Date | null {
  const parts = timeHHMM.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return sydneyWallDateTimeToUtc(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
}

type Props = {
  space: PublicSpaceDetail;
};

type LiveAvailability =
  | { status: 'idle' }
  | { status: 'checking' }
  | {
      status: 'available';
      capacity: number;
      bookedUnits: number;
      spotsRemaining: number;
    }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

function normalizeRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return range;
  if (!range.to) return range;
  if (range.from.getTime() <= range.to.getTime()) return range;
  return { from: range.to, to: range.from };
}

export default function SpaceBookingCard({ space }: Props) {
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: startOfToday(),
    to: startOfToday(),
  }));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);
  const [liveAvailability, setLiveAvailability] = useState<LiveAvailability>({ status: 'idle' });

  const createMutation = useCreateBooking();
  const checkoutMutation = useBookingCheckout();

  const { startAt, endAt } = useMemo(() => {
    const r = normalizeRange(range);
    if (!r?.from || !r?.to) return { startAt: null, endAt: null };
    const s = combineDateAndTime(r.from, startTime);
    const e = combineDateAndTime(r.to, endTime);
    return { startAt: s, endAt: e };
  }, [range, startTime, endTime]);

  const estimatedTotal =
    startAt && endAt && endAt > startAt ? computeHourlyTotal(startAt, endAt, space.hourlyRate) : null;

  const listingCapacity = useMemo(() => effectiveBookingCapacity(space), [space]);

  const hasValidRange = Boolean(startAt && endAt && endAt > startAt);
  const awaitingAvailabilityCheck =
    hasValidRange &&
    !successBookingId &&
    (liveAvailability.status === 'idle' || liveAvailability.status === 'checking');

  useEffect(() => {
    if (successBookingId) {
      setLiveAvailability({ status: 'idle' });
      return;
    }

    if (!startAt || !endAt || endAt <= startAt) {
      setLiveAvailability({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setLiveAvailability({ status: 'checking' });

    const timer = window.setTimeout(() => {
      fetchSlotAvailability(space.id, startAt.toISOString(), endAt.toISOString(), controller.signal)
        .then((res) => {
          if (res.available) {
            setLiveAvailability({
              status: 'available',
              capacity: res.capacity,
              bookedUnits: res.bookedUnits,
              spotsRemaining: res.spotsRemaining,
            });
          } else {
            setLiveAvailability({ status: 'unavailable', reason: res.reason });
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          const message = err instanceof Error ? err.message : 'Could not check availability';
          setLiveAvailability({ status: 'error', message });
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [space.id, startAt, endAt, successBookingId]);

  const handleBook = () => {
    setLocalError(null);
    setSuccessBookingId(null);
    const r = normalizeRange(range);
    if (!r?.from || !r?.to || !startAt || !endAt) {
      setLocalError('Select a start and end date on the calendar, plus start and end times.');
      return;
    }
    if (endAt <= startAt) {
      setLocalError('End time must be after start time.');
      return;
    }

    if (liveAvailability.status === 'unavailable') {
      setLocalError(liveAvailability.reason);
      return;
    }

    createMutation.mutate(
      {
        spaceId: space.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      {
        onSuccess: (data) => {
          checkoutMutation.mutate(data.booking.id, {
            onError: (err) => {
              setSuccessBookingId(data.booking.id);
              setLocalError(err.message);
            },
          });
        },
        onError: (err) => {
          setLocalError(err.message);
        },
      },
    );
  };

  return (
    <Card className="p-6 border-white/10 bg-white/5 space-booking-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Book this space</h2>
        <p className="text-sm text-white/60">
          Select a <strong className="text-white/90">start date</strong> then an <strong className="text-white/90">end date</strong>{' '}
          (inclusive, consecutive calendar range). <strong className="text-white/90">Start time</strong> applies on the first
          day; <strong className="text-white/90">end time</strong> on the last day — one continuous booking. Each booking
          uses one spot; up to {listingCapacity} overlapping booking{listingCapacity === 1 ? '' : 's'} for the same window.
          Your device clock is used for picking; availability rules use Australian Eastern time.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto space-booking-calendar">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={(next) => {
            setRange(next);
            setSuccessBookingId(null);
          }}
          disabled={{ before: startOfToday() }}
          className="mx-auto"
        />
      </div>

      {range?.from && range?.to ? (
        <p className="text-xs text-white/50">
          Range: {range.from.toLocaleDateString('en-AU')} → {range.to.toLocaleDateString('en-AU')}
        </p>
      ) : (
        <p className="text-xs text-amber-200/90">Click a start date, then an end date to complete the range.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
        <label className="block" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="text-xs uppercase tracking-wide text-white/50">Start time (first day)</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setSuccessBookingId(null);
            }}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
          />
        </label>
        <label className="block" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="text-xs uppercase tracking-wide text-white/50">End time (last day)</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setSuccessBookingId(null);
            }}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
          />
        </label>
      </div>

      {estimatedTotal !== null ? (
        <p className="text-sm text-white/80">
          Estimated total:{' '}
          <span className="font-semibold text-white">{formatCurrency(estimatedTotal, space.currency)}</span>{' '}
          <span className="text-white/50">(hourly, rounded up)</span>
        </p>
      ) : null}

      {liveAvailability.status === 'checking' ? (
        <p className="text-sm text-white/60">Checking availability…</p>
      ) : null}
      {liveAvailability.status === 'available' ? (
        <div className="text-sm text-emerald-300" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p>This time window is available.</p>
          <p className="text-white/80">
            Spots left:{' '}
            <span className="font-semibold text-white">
              {liveAvailability.spotsRemaining} of {liveAvailability.capacity}
            </span>{' '}
            ({liveAvailability.bookedUnits} already booked for this window).
          </p>
        </div>
      ) : null}
      {liveAvailability.status === 'unavailable' ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2.5 text-sm text-red-100"
        >
          {liveAvailability.reason}
        </div>
      ) : null}
      {liveAvailability.status === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2.5 text-sm text-red-100"
        >
          {liveAvailability.message}
        </div>
      ) : null}

      {(localError || createMutation.isError) && (localError || createMutation.error) ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2.5 text-sm text-red-100"
        >
          {localError ?? createMutation.error?.message}
        </div>
      ) : null}

      {successBookingId ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p className="font-semibold text-white mb-1">Booking created — continue to pay</p>
          <p className="text-white/80">
            Reference <span className="font-mono text-white">{successBookingId}</span>. We couldn&apos;t open Stripe
            automatically. Open <strong className="text-white">My bookings</strong> and tap <strong>Pay with card</strong>{' '}
            within 10 minutes (AUD).
          </p>
          <Link href="/consumer/bookings" className="inline-block text-sm text-blue-300 hover:text-blue-200 font-medium">
            Go to My bookings →
          </Link>
        </div>
      ) : null}

      <Button
        fullWidth
        onClick={handleBook}
        disabled={
          createMutation.isPending ||
          checkoutMutation.isPending ||
          !range?.from ||
          !range?.to ||
          awaitingAvailabilityCheck ||
          liveAvailability.status === 'unavailable' ||
          !startAt ||
          !endAt ||
          endAt <= startAt
        }
      >
        {checkoutMutation.isPending
          ? 'Opening secure checkout…'
          : createMutation.isPending
            ? 'Booking…'
            : 'Request booking'}
      </Button>
    </Card>
  );
}
