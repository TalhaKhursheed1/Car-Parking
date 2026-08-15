import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { buildProviderEarningsRows } from '@/lib/provider/earningsReport';
import {
  listBookingsForProviderEarningsReport,
  type ProviderEarningsStatusFilter,
} from '@/lib/repositories/bookings';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireProviderSession(
  request: Request,
): { providerId: ObjectId } | NextResponse<{ error: string }> {
  const session = getSessionFromRequest<SessionPayload>(request);

  if (!session?.user?.id || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    return { providerId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }
}

/** Parse YYYY-MM-DD as UTC day bounds. */
function parseDayParam(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (endOfDay) {
    return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}

export type ProviderEarningsResponse = {
  rows: Awaited<ReturnType<typeof buildProviderEarningsRows>>;
  totals: {
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
    estimatedStripeFeeAud: number;
  };
  range: { from: string | null; to: string | null };
  filter: ProviderEarningsStatusFilter;
  totalsHint: string | null;
};

const FILTER_VALUES: ProviderEarningsStatusFilter[] = [
  'paid',
  'pending',
  'cancelled',
  'cancelled_unpaid',
  'cancelled_paid',
  'all',
];

function parseEarningsFilter(raw: string | null): ProviderEarningsStatusFilter {
  if (raw && (FILTER_VALUES as readonly string[]).includes(raw)) {
    return raw as ProviderEarningsStatusFilter;
  }
  return 'paid';
}

function totalsHintForFilter(filter: ProviderEarningsStatusFilter): string | null {
  switch (filter) {
    case 'paid':
      return 'Totals reflect confirmed (paid) bookings in range.';
    case 'pending':
      return 'Totals are estimates if customers complete payment (same fee rules as paid bookings).';
    case 'cancelled':
      return 'Cancelled bookings: unpaid cancels show $0 fees; paid-then-cancelled rows keep historical fee split.';
    case 'cancelled_unpaid':
      return 'Bookings cancelled before payment completed. Gross shows quoted booking total; fees are $0.';
    case 'cancelled_paid':
      return 'Bookings that were paid then cancelled (no refund logic in-app).';
    case 'all':
      return 'Mixed statuses: totals sum row figures (pending is estimated; unpaid cancels have $0 fees).';
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const filter = parseEarningsFilter(searchParams.get('filter'));

    let paidAfter = parseDayParam(fromParam, false);
    let paidBefore = parseDayParam(toParam, true);

    if (!paidAfter && !paidBefore) {
      const to = new Date();
      paidBefore = new Date(
        Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999),
      );
      const from = new Date(paidBefore);
      from.setUTCDate(from.getUTCDate() - 89);
      from.setUTCHours(0, 0, 0, 0);
      paidAfter = from;
    } else if (paidAfter && !paidBefore) {
      const to = new Date();
      paidBefore = new Date(
        Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999),
      );
    } else if (!paidAfter && paidBefore) {
      const f = new Date(paidBefore);
      f.setUTCDate(f.getUTCDate() - 89);
      f.setUTCHours(0, 0, 0, 0);
      paidAfter = f;
    }

    if (paidAfter && paidBefore && paidAfter.getTime() > paidBefore.getTime()) {
      return NextResponse.json(
        { error: 'The end date ("To") must be on or after the start date ("From").' },
        { status: 400 },
      );
    }

    const bookings = await listBookingsForProviderEarningsReport({
      providerId: sessionResult.providerId,
      paidAfter,
      paidBefore,
      filter,
      limit: 1000,
    });

    const rows = await buildProviderEarningsRows(bookings);

    const totals = rows.reduce(
      (acc, r) => ({
        grossAud: acc.grossAud + r.grossAud,
        platformCommissionAud: acc.platformCommissionAud + r.platformCommissionAud,
        providerShareAud: acc.providerShareAud + r.providerShareAud,
        estimatedStripeFeeAud: acc.estimatedStripeFeeAud + r.estimatedStripeFeeAud,
      }),
      {
        grossAud: 0,
        platformCommissionAud: 0,
        providerShareAud: 0,
        estimatedStripeFeeAud: 0,
      },
    );

    totals.grossAud = Math.round(totals.grossAud * 100) / 100;
    totals.platformCommissionAud = Math.round(totals.platformCommissionAud * 100) / 100;
    totals.providerShareAud = Math.round(totals.providerShareAud * 100) / 100;
    totals.estimatedStripeFeeAud = Math.round(totals.estimatedStripeFeeAud * 100) / 100;

    const body: ProviderEarningsResponse = {
      rows,
      totals,
      range: {
        from: paidAfter?.toISOString() ?? null,
        to: paidBefore?.toISOString() ?? null,
      },
      filter,
      totalsHint: totalsHintForFilter(filter),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load provider earnings', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
