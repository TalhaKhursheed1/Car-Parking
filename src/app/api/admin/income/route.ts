import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { buildIncomeReportRows } from '@/lib/admin/incomeReport';
import { listBookingsForIncomeReport } from '@/lib/repositories/bookings';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireAdminSession(request: Request): { adminId: ObjectId } | NextResponse<{ error: string }> {
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

export type AdminIncomeResponse = {
  rows: Awaited<ReturnType<typeof buildIncomeReportRows>>;
  totals: {
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
    estimatedStripeFeeAud: number;
  };
  range: { from: string | null; to: string | null };
};

export async function GET(request: Request) {
  const sessionResult = requireAdminSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

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

    const bookings = await listBookingsForIncomeReport({
      paidAfter,
      paidBefore,
      limit: 1000,
    });

    const rows = await buildIncomeReportRows(bookings);

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

    const body: AdminIncomeResponse = {
      rows,
      totals,
      range: {
        from: paidAfter?.toISOString() ?? null,
        to: paidBefore?.toISOString() ?? null,
      },
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load admin income report', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
