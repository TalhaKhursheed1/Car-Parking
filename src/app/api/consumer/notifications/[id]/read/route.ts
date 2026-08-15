import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { markConsumerNotificationRead } from '@/lib/repositories/notifications';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'consumer') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let consumerId: ObjectId;
  try {
    consumerId = new ObjectId(session.user.id);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { id } = await context.params;
  const updated = await markConsumerNotificationRead(consumerId, id);
  return NextResponse.json({ success: true, updated });
}
