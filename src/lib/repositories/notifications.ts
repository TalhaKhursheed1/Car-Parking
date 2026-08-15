import { ObjectId, WithId } from 'mongodb';

import { getDb } from '@/lib/db';

export type ConsumerNotificationType =
  | 'booking_created_pending_payment'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_expired';

export interface ConsumerNotification {
  _id?: ObjectId;
  userId: ObjectId;
  type: ConsumerNotificationType;
  title: string;
  message: string;
  bookingId?: ObjectId | null;
  readAt?: Date | null;
  createdAt: Date;
  dedupeKey?: string;
}

const COLLECTION = 'notifications';

export async function ensureNotificationIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<ConsumerNotification>(COLLECTION).createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'notif_user_created' },
    { key: { userId: 1, readAt: 1 }, name: 'notif_user_read' },
    { key: { dedupeKey: 1 }, name: 'notif_dedupe_key', unique: true, sparse: true },
  ]);
}

function toObjectId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function createConsumerNotification(input: {
  userId: string | ObjectId;
  type: ConsumerNotificationType;
  title: string;
  message: string;
  bookingId?: string | ObjectId | null;
  dedupeKey?: string;
}): Promise<void> {
  await ensureNotificationIndexes();
  const db = await getDb();
  const now = new Date();
  const doc: ConsumerNotification = {
    userId: toObjectId(input.userId),
    type: input.type,
    title: input.title.slice(0, 160),
    message: input.message.slice(0, 500),
    bookingId: input.bookingId ? toObjectId(input.bookingId) : null,
    readAt: null,
    createdAt: now,
    dedupeKey: input.dedupeKey?.slice(0, 200),
  };

  if (doc.dedupeKey) {
    await db
      .collection<ConsumerNotification>(COLLECTION)
      .updateOne({ dedupeKey: doc.dedupeKey }, { $setOnInsert: doc }, { upsert: true });
    return;
  }

  await db.collection<ConsumerNotification>(COLLECTION).insertOne(doc);
}

export async function listConsumerNotifications(userId: string | ObjectId, limit = 50): Promise<WithId<ConsumerNotification>[]> {
  await ensureNotificationIndexes();
  const db = await getDb();
  const cap = Math.min(Math.max(limit, 1), 100);
  return db
    .collection<ConsumerNotification>(COLLECTION)
    .find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(cap)
    .toArray();
}

export async function countUnreadConsumerNotifications(userId: string | ObjectId): Promise<number> {
  await ensureNotificationIndexes();
  const db = await getDb();
  return db.collection<ConsumerNotification>(COLLECTION).countDocuments({
    userId: toObjectId(userId),
    readAt: null,
  });
}

export async function markConsumerNotificationRead(userId: string | ObjectId, notificationId: string): Promise<boolean> {
  let nid: ObjectId;
  try {
    nid = new ObjectId(notificationId);
  } catch {
    return false;
  }
  const db = await getDb();
  const now = new Date();
  const result = await db.collection<ConsumerNotification>(COLLECTION).updateOne(
    { _id: nid, userId: toObjectId(userId), readAt: null },
    { $set: { readAt: now } },
  );
  return result.matchedCount > 0;
}

export async function markAllConsumerNotificationsRead(userId: string | ObjectId): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const result = await db.collection<ConsumerNotification>(COLLECTION).updateMany(
    { userId: toObjectId(userId), readAt: null },
    { $set: { readAt: now } },
  );
  return result.modifiedCount;
}
