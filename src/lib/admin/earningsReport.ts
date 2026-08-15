import { platformFeeAudDollars } from '@/lib/stripe/fees';

/**
 * Pure helpers that group income rows into earnings buckets (by day,
 * week, month, provider, or city). Lives outside the Mongo layer so it
 * can be unit-tested with hand-crafted rows and re-used for CSV export.
 *
 * We deliberately don't import the full `IncomeReportRow` type here so
 * that this module can be loaded without dragging in the booking /
 * space / user repositories — the test runner stays lean.
 */

/** Minimal shape we need from an income row to bucket / display it. */
export type EarningsInputRow = {
  bookingId: string;
  paidAt: string;
  spaceTitle: string;
  consumerName: string;
  providerLabel: string;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
  stripeCheckoutSessionId: string | null;
  currency: string;
};

export type GroupBy = 'day' | 'week' | 'month' | 'provider' | 'city';

export const GROUP_BY_VALUES: readonly GroupBy[] = [
  'day',
  'week',
  'month',
  'provider',
  'city',
] as const;

export function isGroupBy(value: string | null | undefined): value is GroupBy {
  return Boolean(value) && (GROUP_BY_VALUES as readonly string[]).includes(value as string);
}

export type EarningsBucket = {
  /** Stable key for joins (e.g. ISO date for day, "2026-W12" for week). */
  key: string;
  /** Friendly label for display. */
  label: string;
  bookings: number;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
};

export type EarningsReport = {
  groupBy: GroupBy;
  rows: EarningsBucket[];
  totals: {
    bookings: number;
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
  };
};

/**
 * Earnings rows can come from confirmed bookings that don't have a
 * persisted `platformFeeAmount` yet (older data, manual inserts).
 * We fall back to the closed-form 10% commission in that case.
 */
function resolveCommission(row: EarningsInputRow): number {
  const recorded = Number(row.platformCommissionAud);
  if (Number.isFinite(recorded) && recorded > 0) return recorded;
  return platformFeeAudDollars(row.grossAud);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function dayKey(date: Date): { key: string; label: string } {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  return { key: `${y}-${m}-${d}`, label: `${y}-${m}-${d}` };
}

function monthKey(date: Date): { key: string; label: string } {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const label = date.toLocaleString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { key: `${y}-${m}`, label };
}

/**
 * ISO 8601 week-numbering year + week (e.g. "2026-W23"). This keeps
 * weekly buckets stable across year boundaries (the week containing
 * Jan 1st can belong to week 52 of the previous year).
 */
function isoWeekKey(date: Date): { key: string; label: string } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = (target.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  target.setUTCDate(target.getUTCDate() - dayOfWeek + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff =
    (target.getTime() - firstThursday.getTime()) / (24 * 60 * 60 * 1000);
  const weekNumber = 1 + Math.floor(diff / 7);
  const key = `${target.getUTCFullYear()}-W${pad2(weekNumber)}`;
  return { key, label: key };
}

function timeBasedKey(iso: string, groupBy: 'day' | 'week' | 'month'): { key: string; label: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { key: 'unknown', label: 'Unknown' };
  }
  if (groupBy === 'day') return dayKey(date);
  if (groupBy === 'week') return isoWeekKey(date);
  return monthKey(date);
}

function providerKey(row: EarningsInputRow): { key: string; label: string } {
  const label = row.providerLabel?.trim() || 'Unknown provider';
  return { key: label.toLowerCase(), label };
}

function cityKeyFromTitle(row: EarningsRowWithLocation): { key: string; label: string } {
  // The income report doesn't carry city, so we use the space title as a
  // fallback. Callers that want true city grouping should hydrate the
  // report rows with `city` before calling - see `EarningsRowWithLocation`.
  const label = row.city?.trim() || row.spaceTitle?.trim() || 'Unknown';
  return { key: label.toLowerCase(), label };
}

/** Optional shape for callers that want to enrich rows with a `city` field. */
export type EarningsRowWithLocation = EarningsInputRow & { city?: string | null };

export function buildEarningsReport(
  rows: EarningsInputRow[] | EarningsRowWithLocation[],
  groupBy: GroupBy,
): EarningsReport {
  const buckets = new Map<string, EarningsBucket>();
  let bookings = 0;
  let grossAud = 0;
  let platformCommissionAud = 0;
  let providerShareAud = 0;

  for (const row of rows) {
    const commission = resolveCommission(row);
    const providerShare = row.grossAud - commission;

    bookings += 1;
    grossAud += row.grossAud;
    platformCommissionAud += commission;
    providerShareAud += providerShare;

    let bucketInfo: { key: string; label: string };
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      bucketInfo = timeBasedKey(row.paidAt, groupBy);
    } else if (groupBy === 'provider') {
      bucketInfo = providerKey(row);
    } else {
      bucketInfo = cityKeyFromTitle(row as EarningsRowWithLocation);
    }

    const existing = buckets.get(bucketInfo.key);
    if (existing) {
      existing.bookings += 1;
      existing.grossAud = roundCurrency(existing.grossAud + row.grossAud);
      existing.platformCommissionAud = roundCurrency(
        existing.platformCommissionAud + commission,
      );
      existing.providerShareAud = roundCurrency(
        existing.providerShareAud + providerShare,
      );
    } else {
      buckets.set(bucketInfo.key, {
        key: bucketInfo.key,
        label: bucketInfo.label,
        bookings: 1,
        grossAud: roundCurrency(row.grossAud),
        platformCommissionAud: roundCurrency(commission),
        providerShareAud: roundCurrency(providerShare),
      });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => {
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      // Time-based keys sort lexicographically (newest first feels more useful for admins).
      return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
    }
    return b.grossAud - a.grossAud;
  });

  return {
    groupBy,
    rows: sorted,
    totals: {
      bookings,
      grossAud: roundCurrency(grossAud),
      platformCommissionAud: roundCurrency(platformCommissionAud),
      providerShareAud: roundCurrency(providerShareAud),
    },
  };
}

/* ------------------------------------------------------------------ */
/* CSV serialization                                                  */
/* ------------------------------------------------------------------ */

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function reportToCsv(report: EarningsReport): string {
  const header = [
    report.groupBy === 'day'
      ? 'Date'
      : report.groupBy === 'week'
        ? 'Week'
        : report.groupBy === 'month'
          ? 'Month'
          : report.groupBy === 'provider'
            ? 'Provider'
            : 'City',
    'Bookings',
    'Gross (AUD)',
    'Platform commission (AUD)',
    'Net to providers (AUD)',
  ];

  const lines = [header.map(escapeCsvField).join(',')];

  for (const row of report.rows) {
    lines.push(
      [
        escapeCsvField(row.label),
        escapeCsvField(row.bookings),
        escapeCsvField(row.grossAud.toFixed(2)),
        escapeCsvField(row.platformCommissionAud.toFixed(2)),
        escapeCsvField(row.providerShareAud.toFixed(2)),
      ].join(','),
    );
  }

  lines.push(
    [
      escapeCsvField('Totals'),
      escapeCsvField(report.totals.bookings),
      escapeCsvField(report.totals.grossAud.toFixed(2)),
      escapeCsvField(report.totals.platformCommissionAud.toFixed(2)),
      escapeCsvField(report.totals.providerShareAud.toFixed(2)),
    ].join(','),
  );

  return lines.join('\r\n');
}

export function detailedIncomeRowsToCsv(rows: EarningsInputRow[]): string {
  const header = [
    'Booking ID',
    'Paid at (UTC)',
    'Space',
    'Customer',
    'Provider',
    'Currency',
    'Gross',
    'Platform commission (AUD)',
    'Net to provider (AUD)',
    'Est. Stripe fee (AUD)',
    'Stripe session',
  ];
  const lines = [header.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.bookingId),
        escapeCsvField(row.paidAt),
        escapeCsvField(row.spaceTitle),
        escapeCsvField(row.consumerName),
        escapeCsvField(row.providerLabel),
        escapeCsvField(row.currency),
        escapeCsvField(row.grossAud.toFixed(2)),
        escapeCsvField(row.platformCommissionAud.toFixed(2)),
        escapeCsvField(row.providerShareAud.toFixed(2)),
        escapeCsvField(row.estimatedStripeFeeAud.toFixed(2)),
        escapeCsvField(row.stripeCheckoutSessionId ?? ''),
      ].join(','),
    );
  }
  return lines.join('\r\n');
}
