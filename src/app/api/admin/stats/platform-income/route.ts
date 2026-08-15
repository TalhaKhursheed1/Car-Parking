import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { aggregateConfirmedPlatformCommissionAud } from '@/lib/repositories/bookings';

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

export type AdminPlatformIncomeSummaryResponse = {
  platformCommissionAud: number;
  confirmedBookingCount: number;
};

export async function GET(request: Request) {
  const sessionResult = requireAdminSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const totals = await aggregateConfirmedPlatformCommissionAud();
    const body: AdminPlatformIncomeSummaryResponse = {
      platformCommissionAud: totals.platformCommissionAud,
      confirmedBookingCount: totals.confirmedBookingCount,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to load admin platform income summary', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
