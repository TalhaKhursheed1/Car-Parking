import { BOOKING_TIMEZONE } from '@/lib/booking/availability';

const partsFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: BOOKING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: 'numeric',
  hour12: false,
});

function sydneyPartsAt(utcMs: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = partsFormatter.formatToParts(new Date(utcMs));
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }
  return {
    year: parseInt(map.year ?? '0', 10),
    month: parseInt(map.month ?? '0', 10),
    day: parseInt(map.day ?? '0', 10),
    hour: parseInt(map.hour ?? '0', 10),
    minute: parseInt(map.minute ?? '0', 10),
  };
}

/**
 * Calendar date + clock time interpreted as **Australia/Sydney** civil time (not browser local).
 * Matches the server’s `validateBookingAgainstSpace` / `getSydneyWallParts` logic.
 */
export function sydneyWallDateTimeToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Scan a UTC window wide enough that every Sydney-local minute on this civil date appears.
  const start = Date.UTC(year, monthIndex, day - 1, 0, 0, 0, 0);
  const end = Date.UTC(year, monthIndex, day + 2, 0, 0, 0, 0);

  for (let t = start; t < end; t += 60 * 1000) {
    const p = sydneyPartsAt(t);
    if (
      p.year === year &&
      p.month === monthIndex + 1 &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    ) {
      return new Date(t);
    }
  }

  return new Date(Date.UTC(year, monthIndex, day, hour - 11, minute, 0, 0));
}
