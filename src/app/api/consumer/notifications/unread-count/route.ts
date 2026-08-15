import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { countUnreadConsumerNotifications } from '@/lib/repositories/notifications';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(request: Request) {
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
  const unread = await countUnreadConsumerNotifications(consumerId);
  return NextResponse.json({ unread });
}
