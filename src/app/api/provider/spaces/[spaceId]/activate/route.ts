import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '@/lib/auth/session';
import { findSpaceById, updateSpace } from '@/lib/repositories/spaces';
import { ObjectId } from 'mongodb';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type ActivatePayload = {
  isActive: boolean;
};

function requireProviderSession(request: Request): { providerId: ObjectId } | NextResponse<{ error: string }> {
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

export async function POST(
  request: Request,
  context: { params: Promise<{ spaceId: string }> },
) {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const { spaceId } = await context.params;

  let payload: ActivatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const space = await findSpaceById(spaceId);

    if (!space || !space.providerId.equals(sessionResult.providerId)) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    if (space.status !== 'approved') {
      return NextResponse.json({ error: 'Space must be approved before changing activation' }, { status: 400 });
    }

    await updateSpace(spaceId, {
      isActive: payload.isActive,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to toggle space activation', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
