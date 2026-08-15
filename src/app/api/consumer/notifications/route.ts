import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  listConsumerNotifications,
  markAllConsumerNotificationsRead,
} from '@/lib/repositories/notifications';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function serializeNotification(row: {
  _id: ObjectId;
  type: string;
  title: string;
  message: string;
  bookingId?: ObjectId | null;
  readAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: row._id.toString(),
    type: row.type,
    title: row.title,
    message: row.message,
    bookingId: row.bookingId ? row.bookingId.toString() : null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function getConsumerId(request: Request): ObjectId | null {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'consumer') {
    return null;
  }
  try {
    return new ObjectId(session.user.id);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const consumerId = getConsumerId(request);
  if (!consumerId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
  const rows = await listConsumerNotifications(consumerId, limit);

  return NextResponse.json({ data: rows.map(serializeNotification) });
}

export async function POST(request: Request) {
  const consumerId = getConsumerId(request);
  if (!consumerId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const updated = await markAllConsumerNotificationsRead(consumerId);
  return NextResponse.json({ success: true, updated });
}
