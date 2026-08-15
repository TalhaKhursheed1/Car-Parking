import { ObjectId, WithId } from 'mongodb';

import { getDb } from '@/lib/db';

export interface Review {
  _id?: ObjectId;
  bookingId: ObjectId;
  spaceId: ObjectId;
  providerId: ObjectId;
  consumerId: ObjectId;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'reviews';
const SPACES_COLLECTION = 'spaces';

export async function ensureReviewIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection<Review>(COLLECTION);

  // Drop the legacy "one review per booking" index if it still exists.
  // The new model is "one review per consumer per space" - a consumer can
  // re-book the same space many times but keeps a single editable review.
  try {
    await collection.dropIndex('review_booking_unique');
  } catch {
    // Index didn't exist - safe to ignore.
  }

  await collection.createIndexes([
    { key: { spaceId: 1, createdAt: -1 }, name: 'review_space_created' },
    { key: { consumerId: 1, createdAt: -1 }, name: 'review_consumer_created' },
    {
      key: { consumerId: 1, spaceId: 1 },
      name: 'review_consumer_space_unique',
      unique: true,
    },
    { key: { bookingId: 1 }, name: 'review_booking_lookup' },
  ]);
}

function toObjectId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function findReviewByConsumerAndSpace(
  consumerId: string | ObjectId,
  spaceId: string | ObjectId,
): Promise<WithId<Review> | null> {
  let cid: ObjectId;
  let sid: ObjectId;
  try {
    cid = toObjectId(consumerId);
    sid = toObjectId(spaceId);
  } catch {
    return null;
  }
  const db = await getDb();
  return db
    .collection<Review>(COLLECTION)
    .findOne({ consumerId: cid, spaceId: sid });
}

export async function listReviewsBySpaceId(
  spaceId: string | ObjectId,
  limit = 50,
): Promise<WithId<Review>[]> {
  let oid: ObjectId;
  try {
    oid = toObjectId(spaceId);
  } catch {
    return [];
  }
  const cap = Math.min(Math.max(limit, 1), 100);
  const db = await getDb();
  return db
    .collection<Review>(COLLECTION)
    .find({ spaceId: oid })
    .sort({ createdAt: -1 })
    .limit(cap)
    .toArray();
}

export async function listReviewsByConsumerId(
  consumerId: string | ObjectId,
  limit = 100,
): Promise<WithId<Review>[]> {
  let oid: ObjectId;
  try {
    oid = toObjectId(consumerId);
  } catch {
    return [];
  }
  const cap = Math.min(Math.max(limit, 1), 200);
  const db = await getDb();
  return db
    .collection<Review>(COLLECTION)
    .find({ consumerId: oid })
    .sort({ createdAt: -1 })
    .limit(cap)
    .toArray();
}

/**
 * Recomputes the average rating and review count for a space and persists them
 * on the `spaces` document so list endpoints can sort/filter without joining.
 */
export async function recomputeSpaceRatingAggregates(spaceId: string | ObjectId): Promise<{
  ratingAverage: number;
  ratingCount: number;
}> {
  let oid: ObjectId;
  try {
    oid = toObjectId(spaceId);
  } catch {
    return { ratingAverage: 0, ratingCount: 0 };
  }

  const db = await getDb();
  const rows = await db
    .collection<Review>(COLLECTION)
    .aggregate<{ ratingAverage: number; ratingCount: number }>([
      { $match: { spaceId: oid } },
      {
        $group: {
          _id: null,
          ratingAverage: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const row = rows[0];
  const ratingAverage = row ? Math.round(row.ratingAverage * 10) / 10 : 0;
  const ratingCount = row ? row.ratingCount : 0;

  await db.collection(SPACES_COLLECTION).updateOne(
    { _id: oid },
    { $set: { ratingAverage, ratingCount, updatedAt: new Date() } },
  );

  return { ratingAverage, ratingCount };
}

export type UpsertReviewInput = {
  bookingId: string | ObjectId;
  spaceId: string | ObjectId;
  providerId: string | ObjectId;
  consumerId: string | ObjectId;
  rating: number;
  comment: string | null;
};

/**
 * Create or update the consumer's single review for a space (unique on
 * `(consumerId, spaceId)`). `bookingId` is captured for provenance - it's
 * just "this is one of the bookings that made them eligible to review" -
 * and stays put on subsequent edits even if a newer booking came along.
 */
export async function upsertReviewForSpace(input: UpsertReviewInput): Promise<{
  review: WithId<Review>;
  created: boolean;
}> {
  await ensureReviewIndexes();

  const bookingId = toObjectId(input.bookingId);
  const consumerId = toObjectId(input.consumerId);
  const spaceId = toObjectId(input.spaceId);
  const providerId = toObjectId(input.providerId);

  const db = await getDb();
  const now = new Date();

  const existing = await db
    .collection<Review>(COLLECTION)
    .findOne({ consumerId, spaceId });
  if (existing) {
    await db.collection<Review>(COLLECTION).updateOne(
      { _id: existing._id },
      { $set: { rating: input.rating, comment: input.comment, updatedAt: now } },
    );
    const review = (await db
      .collection<Review>(COLLECTION)
      .findOne({ _id: existing._id })) as WithId<Review>;
    await recomputeSpaceRatingAggregates(spaceId);
    return { review, created: false };
  }

  const doc: Review = {
    bookingId,
    spaceId,
    providerId,
    consumerId,
    rating: input.rating,
    comment: input.comment,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<Review>(COLLECTION).insertOne(doc);
  await recomputeSpaceRatingAggregates(spaceId);
  return { review: { _id: result.insertedId, ...doc }, created: true };
}

export async function deleteReviewByConsumerAndSpace(
  consumerId: string | ObjectId,
  spaceId: string | ObjectId,
): Promise<boolean> {
  let cid: ObjectId;
  let sid: ObjectId;
  try {
    cid = toObjectId(consumerId);
    sid = toObjectId(spaceId);
  } catch {
    return false;
  }
  const db = await getDb();
  const result = await db
    .collection<Review>(COLLECTION)
    .deleteOne({ consumerId: cid, spaceId: sid });
  if ((result.deletedCount ?? 0) > 0) {
    await recomputeSpaceRatingAggregates(sid);
    return true;
  }
  return false;
}
