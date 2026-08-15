import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { buildIncomeReportRows, type IncomeReportRow } from '@/lib/admin/incomeReport';
import {
  buildEarningsReport,
  detailedIncomeRowsToCsv,
  isGroupBy,
  reportToCsv,
  type EarningsReport,
  type EarningsRowWithLocation,
  type GroupBy,
} from '@/lib/admin/earningsReport';
import { listBookingsForIncomeReport } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireAdminSession(
  request: Request,
): { adminId: ObjectId } | NextResponse<{ error: string }> {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  try {
    return { adminId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 });
  }
}

function parseDayParam(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  if (endOfDay) {
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999));
  }
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0));
}

function isoDayName(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export type AdminEarningsReportResponse = EarningsReport & {
  range: { from: string | null; to: string | null };
  bookingCount: number;
};

export async function GET(request: Request) {
  const auth = requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const groupByParam = url.searchParams.get('groupBy');
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase();

  const resolvedGroupByParam = groupByParam ?? 'day';
  if (!isGroupBy(resolvedGroupByParam)) {
    return NextResponse.json(
      { error: 'groupBy must be one of: day, week, month, provider, city.' },
      { status: 400 },
    );
  }
  const groupBy: GroupBy = resolvedGroupByParam;

  let paidAfter = parseDayParam(fromParam, false);
  let paidBefore = parseDayParam(toParam, true);
  if (!paidAfter && !paidBefore) {
    const now = new Date();
    paidBefore = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    paidAfter = new Date(paidBefore);
    paidAfter.setUTCDate(paidAfter.getUTCDate() - 89);
    paidAfter.setUTCHours(0, 0, 0, 0);
  }
  if (paidAfter && paidBefore && paidAfter.getTime() > paidBefore.getTime()) {
    return NextResponse.json(
      { error: 'The end date ("to") must be on or after the start date ("from").' },
      { status: 400 },
    );
  }

  if (format !== 'json' && format !== 'csv' && format !== 'csv-detailed') {
    return NextResponse.json(
      { error: 'format must be one of: json, csv, csv-detailed.' },
      { status: 400 },
    );
  }

  try {
    const bookings = await listBookingsForIncomeReport({
      paidAfter,
      paidBefore,
      limit: 5000,
    });

    let rows: IncomeReportRow[] | EarningsRowWithLocation[] = await buildIncomeReportRows(
      bookings,
    );

    // City grouping needs a `city` field on each row, which the standard
    // income report doesn't carry. Hydrate just-in-time when requested.
    if (groupBy === 'city') {
      const spaceIds = Array.from(
        new Set(bookings.map((b) => b.spaceId.toHexString())),
      ).map((hex) => new ObjectId(hex));
      const spaces = await findSpacesByIds(spaceIds);
      const cityBySpaceId = new Map<string, string | null>(
        spaces.map((s) => [s._id!.toHexString(), (s.city ?? '').trim() || null]),
      );
      const spaceIdByBookingId = new Map<string, string>(
        bookings.map((b) => [b._id!.toHexString(), b.spaceId.toHexString()]),
      );
      rows = rows.map<EarningsRowWithLocation>((row) => {
        const sid = spaceIdByBookingId.get(row.bookingId);
        return {
          ...row,
          city: sid ? cityBySpaceId.get(sid) ?? null : null,
        };
      });
    }

    const report = buildEarningsReport(rows, groupBy);

    if (format === 'csv') {
      const csv = reportToCsv(report);
      const filename = `earnings-${groupBy}-${paidAfter ? isoDayName(paidAfter) : 'start'}-${paidBefore ? isoDayName(paidBefore) : 'end'}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'csv-detailed') {
      const detailed = rows as IncomeReportRow[];
      const csv = detailedIncomeRowsToCsv(detailed);
      const filename = `earnings-detailed-${paidAfter ? isoDayName(paidAfter) : 'start'}-${paidBefore ? isoDayName(paidBefore) : 'end'}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const body: AdminEarningsReportResponse = {
      ...report,
      range: {
        from: paidAfter?.toISOString() ?? null,
        to: paidBefore?.toISOString() ?? null,
      },
      bookingCount: rows.length,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load admin earnings report', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
