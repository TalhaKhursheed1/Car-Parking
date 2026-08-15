import { WEEK_DAYS } from '@/lib/validation/customAvailability';
import type { Space } from '@/lib/repositories/spaces';

/** Bookings are interpreted in this timezone (matches en-AU listing context). */
export const BOOKING_TIMEZONE = 'Australia/Sydney';

const BUSINESS_DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
const BUSINESS_START_MIN = 9 * 60;
const BUSINESS_END_MIN = 17 * 60;

const MIN_BOOKING_MS = 30 * 60 * 1000;
/** Max continuous booking length (inclusive multi-day span). */
const MAX_BOOKING_MS = 31 * 24 * 60 * 60 * 1000;

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

type SydneyWallParts = {
  weekday: string;
  dateKey: string;
  minutesSinceMidnight: number;
};

function getSydneyWallParts(date: Date): SydneyWallParts {
  const dtf = new Intl.DateTimeFormat('en-AU', {
    timeZone: BOOKING_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  const weekday = map.weekday ?? '';
  const year = map.year ?? '';
  const month = map.month ?? '';
  const day = map.day ?? '';
  const hour = parseInt(map.hour ?? '0', 10);
  const minute = parseInt(map.minute ?? '0', 10);
  const dateKey = `${year}-${month}-${day}`;
  return {
    weekday,
    dateKey,
    minutesSinceMidnight: hour * 60 + minute,
  };
}

function isWeekdayInCustom(day: string): day is (typeof WEEK_DAYS)[number] {
  return (WEEK_DAYS as readonly string[]).includes(day);
}

function isWithinCustomWindow(
  space: Space,
  weekday: string,
  startMin: number,
  endMin: number,
): boolean {
  if (!isWeekdayInCustom(weekday)) {
    return false;
  }
  const entries = space.customAvailability ?? [];
  for (const entry of entries) {
    if (entry.day.toLowerCase() !== weekday.toLowerCase()) continue;
    const segStart = parseTimeToMinutes(entry.startTime);
    const segEnd = parseTimeToMinutes(entry.endTime);
    if (Number.isNaN(segStart) || Number.isNaN(segEnd)) continue;
    if (startMin >= segStart && endMin <= segEnd) {
      return true;
    }
  }
  return false;
}

/** Build per–Sydney-day segments covered by [startAt, endAt) using 1-minute steps (handles DST). */
function splitBookingIntoSydneyDaySegments(
  startAt: Date,
  endAt: Date,
): Map<string, { weekday: string; minMinute: number; maxMinute: number }> {
  const map = new Map<string, { weekday: string; minMinute: number; maxMinute: number }>();
  const endMs = endAt.getTime();
  for (let t = startAt.getTime(); t < endMs; t += 60 * 1000) {
    const p = getSydneyWallParts(new Date(t));
    const m = p.minutesSinceMidnight;
    const cur = map.get(p.dateKey);
    if (!cur) {
      map.set(p.dateKey, { weekday: p.weekday, minMinute: m, maxMinute: m });
    } else {
      cur.minMinute = Math.min(cur.minMinute, m);
      cur.maxMinute = Math.max(cur.maxMinute, m);
    }
  }
  return map;
}

function validateSydneyDaySegment(
  space: Space,
  weekday: string,
  segmentStartMin: number,
  segmentEndExclusiveMin: number,
): string | null {
  if (segmentEndExclusiveMin <= segmentStartMin) {
    return null;
  }
  const lastInclusiveMin = segmentEndExclusiveMin - 1;

  switch (space.availabilityType) {
    case '24_7':
      return null;
    case 'business_hours': {
      if (!BUSINESS_DAYS.has(weekday)) {
        return `Part of your booking falls on ${weekday} (only Monday–Friday are allowed).`;
      }
      if (segmentStartMin < BUSINESS_START_MIN || segmentEndExclusiveMin > BUSINESS_END_MIN) {
        return 'Part of your booking falls outside 09:00–17:00 on a business day.';
      }
      return null;
    }
    case 'custom': {
      if (!isWithinCustomWindow(space, weekday, segmentStartMin, lastInclusiveMin)) {
        return 'Part of your booking is outside this space’s published availability.';
      }
      return null;
    }
    default:
      return 'Unknown availability configuration for this space.';
  }
}

export function validateBookingAgainstSpace(space: Space, startAt: Date, endAt: Date): string | null {
  if (!(startAt instanceof Date) || !(endAt instanceof Date) || Number.isNaN(+startAt) || Number.isNaN(+endAt)) {
    return 'Invalid start or end time.';
  }

  if (endAt <= startAt) {
    return 'End date and time must be after the start date and time.';
  }

  const duration = endAt.getTime() - startAt.getTime();
  if (duration < MIN_BOOKING_MS) {
    return 'Booking must be at least 30 minutes.';
  }
  if (duration > MAX_BOOKING_MS) {
    return 'Booking cannot exceed 31 consecutive days.';
  }

  const now = Date.now();
  if (startAt.getTime() < now - 60_000) {
    return 'Start time cannot be in the past.';
  }

  const segments = splitBookingIntoSydneyDaySegments(startAt, endAt);
  if (segments.size === 0) {
    return 'Invalid booking window.';
  }

  for (const [, seg] of segments) {
    const err = validateSydneyDaySegment(
      space,
      seg.weekday,
      seg.minMinute,
      seg.maxMinute + 1,
    );
    if (err) {
      return err;
    }
  }

  return null;
}

export function computeHourlyTotal(startAt: Date, endAt: Date, hourlyRate: number): number {
  const ms = endAt.getTime() - startAt.getTime();
  const hours = ms / (60 * 60 * 1000);
  const billedHours = Math.max(1, Math.ceil(hours - 1e-9));
  return Math.round(billedHours * hourlyRate * 100) / 100;
}
