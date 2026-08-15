import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { listLikedSpaceIdsByConsumer } from '@/lib/repositories/spaceLikes';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(req: Request) {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let consumerObjectId: ObjectId;
  try {
    consumerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const spaceIds = await listLikedSpaceIdsByConsumer(consumerObjectId);
    return NextResponse.json({ spaceIds });
  } catch (error) {
    console.error('Failed to list liked spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
