import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '@/lib/auth/session';
import { listAdminActivities } from '@/lib/repositories/adminActivities';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const { rows, total } = await listAdminActivities({ limit, offset });
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row._id.toString(),
      type: row.type,
      actorLabel: row.actorLabel,
      actionLabel: row.actionLabel,
      contextLabel: row.contextLabel ?? null,
      status: row.status ?? 'info',
      entityId: row.entityId ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    offset: Math.max(offset, 0),
    limit: Math.min(Math.max(limit, 1), 200),
  });
}
