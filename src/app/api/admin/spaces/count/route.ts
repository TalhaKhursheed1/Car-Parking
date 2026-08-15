import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { Space } from '@/lib/repositories/spaces';

const COLLECTION = 'spaces';

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

export async function GET(request: Request) {
  const sessionResult = requireAdminSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const db = await getDb();
    const collection = db.collection<Space>(COLLECTION);
    
    // Get total count of all spaces regardless of status
    const total = await collection.countDocuments({});

    return NextResponse.json({ total });
  } catch (error) {
    console.error('Failed to get spaces count', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

