import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { countActiveConfirmedBookings } from '@/lib/repositories/bookings';

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

export type AdminActiveBookingsResponse = {
  /** Confirmed bookings currently within start/end window. */
  activeCount: number;
};

export async function GET(request: Request) {
  const sessionResult = requireAdminSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const activeCount = await countActiveConfirmedBookings();
    const body: AdminActiveBookingsResponse = { activeCount };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to count active bookings', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
