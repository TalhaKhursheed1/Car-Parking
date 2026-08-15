import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEarningsReport,
  detailedIncomeRowsToCsv,
  isGroupBy,
  reportToCsv,
  type EarningsInputRow,
  type EarningsRowWithLocation,
  type GroupBy,
} from '../src/lib/admin/earningsReport';

function row(
  overrides: Partial<EarningsInputRow> & { city?: string | null } = {},
): EarningsInputRow & { city?: string | null } {
  const base: EarningsRowWithLocation = {
    bookingId: 'b1',
    paidAt: '2026-05-30T10:00:00.000Z',
    spaceTitle: 'Sunset Garage',
    consumerName: 'Alice',
    providerLabel: 'Bob Co',
    grossAud: 100,
    platformCommissionAud: 10,
    providerShareAud: 90,
    estimatedStripeFeeAud: 3.2,
    stripeCheckoutSessionId: 'cs_test_1',
    currency: 'AUD',
  };
  return { ...base, ...overrides };
}

describe('isGroupBy', () => {
  it('accepts known values', () => {
    for (const v of ['day', 'week', 'month', 'provider', 'city'] as GroupBy[]) {
      assert.equal(isGroupBy(v), true);
    }
  });

  it('rejects unknown values', () => {
    assert.equal(isGroupBy(''), false);
    assert.equal(isGroupBy(null), false);
    assert.equal(isGroupBy('year'), false);
  });
});

describe('buildEarningsReport - day grouping', () => {
  it('buckets rows by UTC day and totals revenue', () => {
    const report = buildEarningsReport(
      [
        row({ bookingId: 'a', paidAt: '2026-05-30T01:00:00.000Z', grossAud: 50, platformCommissionAud: 5 }),
        row({ bookingId: 'b', paidAt: '2026-05-30T22:00:00.000Z', grossAud: 75, platformCommissionAud: 7.5 }),
        row({ bookingId: 'c', paidAt: '2026-05-31T05:00:00.000Z', grossAud: 30, platformCommissionAud: 3 }),
      ],
      'day',
    );

    assert.equal(report.groupBy, 'day');
    assert.equal(report.rows.length, 2);
    // Newest-first ordering for time buckets.
    assert.equal(report.rows[0].key, '2026-05-31');
    assert.equal(report.rows[0].bookings, 1);
    assert.equal(report.rows[1].key, '2026-05-30');
    assert.equal(report.rows[1].bookings, 2);
    assert.equal(report.rows[1].grossAud, 125);
    assert.equal(report.rows[1].platformCommissionAud, 12.5);
    assert.equal(report.rows[1].providerShareAud, 112.5);
    assert.equal(report.totals.bookings, 3);
    assert.equal(report.totals.grossAud, 155);
  });

  it('falls back to 10% commission when platformCommissionAud is missing', () => {
    const report = buildEarningsReport(
      [row({ grossAud: 200, platformCommissionAud: 0 })],
      'day',
    );
    assert.equal(report.rows[0].platformCommissionAud, 20);
    assert.equal(report.rows[0].providerShareAud, 180);
  });
});

describe('buildEarningsReport - month / week grouping', () => {
  it('groups by ISO week-numbering year/week', () => {
    const report = buildEarningsReport(
      [
        row({ paidAt: '2026-01-01T12:00:00.000Z' }), // Thu - week 1 of 2026
        row({ paidAt: '2026-01-05T12:00:00.000Z' }), // Mon - week 2 of 2026
      ],
      'week',
    );
    const keys = report.rows.map((r) => r.key).sort();
    assert.deepEqual(keys, ['2026-W01', '2026-W02']);
  });

  it('groups by month with stable YYYY-MM keys', () => {
    const report = buildEarningsReport(
      [
        row({ paidAt: '2026-04-30T22:00:00.000Z', grossAud: 40 }),
        row({ paidAt: '2026-05-01T01:00:00.000Z', grossAud: 60 }),
      ],
      'month',
    );
    assert.equal(report.rows.length, 2);
    const map = new Map(report.rows.map((r) => [r.key, r.grossAud]));
    assert.equal(map.get('2026-04'), 40);
    assert.equal(map.get('2026-05'), 60);
  });
});

describe('buildEarningsReport - provider / city grouping', () => {
  it('groups by provider label case-insensitively and sorts by gross desc', () => {
    const report = buildEarningsReport(
      [
        row({ providerLabel: 'Acme Co', grossAud: 100 }),
        row({ providerLabel: 'acme co', grossAud: 50 }),
        row({ providerLabel: 'Zen Spaces', grossAud: 200 }),
      ],
      'provider',
    );
    assert.equal(report.rows[0].label, 'Zen Spaces');
    assert.equal(report.rows[0].grossAud, 200);
    assert.equal(report.rows[1].label, 'Acme Co');
    assert.equal(report.rows[1].bookings, 2);
    assert.equal(report.rows[1].grossAud, 150);
  });

  it('groups by city when rows are hydrated', () => {
    const report = buildEarningsReport(
      [
        row({ city: 'Sydney', grossAud: 90 }) as EarningsRowWithLocation,
        row({ city: 'sydney', grossAud: 10 }) as EarningsRowWithLocation,
        row({ city: 'Melbourne', grossAud: 200 }) as EarningsRowWithLocation,
      ],
      'city',
    );
    assert.equal(report.rows[0].label, 'Melbourne');
    assert.equal(report.rows[1].label, 'Sydney');
    assert.equal(report.rows[1].bookings, 2);
  });

  it('falls back to space title when city missing', () => {
    const report = buildEarningsReport(
      [row({ spaceTitle: 'Lone Garage' })],
      'city',
    );
    assert.equal(report.rows[0].label, 'Lone Garage');
  });
});

describe('reportToCsv / detailedIncomeRowsToCsv', () => {
  it('serialises a grouped report with header + totals row', () => {
    const report = buildEarningsReport(
      [row({ providerLabel: 'Acme, "Pty" Ltd', grossAud: 100 })],
      'provider',
    );
    const csv = reportToCsv(report);
    const lines = csv.split('\r\n');
    assert.equal(lines[0], 'Provider,Bookings,Gross (AUD),Platform commission (AUD),Net to providers (AUD)');
    // Embedded commas and quotes must be escaped.
    assert.match(lines[1], /^"Acme, ""Pty"" Ltd",1,100\.00,10\.00,90\.00$/);
    assert.equal(lines.at(-1), 'Totals,1,100.00,10.00,90.00');
  });

  it('serialises per-booking detail rows', () => {
    const csv = detailedIncomeRowsToCsv([row()]);
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 2);
    assert.ok(lines[0].startsWith('Booking ID,Paid at (UTC)'));
    assert.ok(lines[1].includes('Sunset Garage'));
    assert.ok(lines[1].includes('cs_test_1'));
  });

  it('handles empty Stripe session ids', () => {
    const csv = detailedIncomeRowsToCsv([row({ stripeCheckoutSessionId: null })]);
    const lines = csv.split('\r\n');
    // Trailing field is empty (no quotes, no junk).
    assert.ok(/,\s*$/.test(lines[1]));
  });
});
