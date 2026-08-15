import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';

export interface SpaceLike {
  _id?: ObjectId;
  consumerId: ObjectId;
  spaceId: ObjectId;
  createdAt: Date;
}

const COLLECTION = 'spaceLikes';
const SPACES_COLLECTION = 'spaces';

export async function ensureSpaceLikeIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<SpaceLike>(COLLECTION).createIndexes([
    {
      key: { consumerId: 1, spaceId: 1 },
      name: 'spacelike_consumer_space_unique',
      unique: true,
    },
    { key: { spaceId: 1, createdAt: -1 }, name: 'spacelike_space_created' },
    { key: { consumerId: 1, createdAt: -1 }, name: 'spacelike_consumer_created' },
  ]);
}

function toObjectId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

export async function isSpaceLikedByConsumer(
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
  const row = await db
    .collection<SpaceLike>(COLLECTION)
    .findOne({ consumerId: cid, spaceId: sid }, { projection: { _id: 1 } });
  return Boolean(row);
}

export async function countSpaceLikes(spaceId: string | ObjectId): Promise<number> {
  let sid: ObjectId;
  try {
    sid = toObjectId(spaceId);
  } catch {
    return 0;
  }
  const db = await getDb();
  return db.collection<SpaceLike>(COLLECTION).countDocuments({ spaceId: sid });
}

export async function listLikedSpaceIdsByConsumer(
  consumerId: string | ObjectId,
): Promise<string[]> {
  let cid: ObjectId;
  try {
    cid = toObjectId(consumerId);
  } catch {
    return [];
  }
  const db = await getDb();
  const rows = await db
    .collection<SpaceLike>(COLLECTION)
    .find({ consumerId: cid })
    .project<{ spaceId: ObjectId }>({ spaceId: 1 })
    .toArray();
  return rows.map((row) => row.spaceId.toString());
}

/**
 * Recomputes and persists `likeCount` on the space document so we can render
 * it without a separate query.
 */
async function recomputeSpaceLikeCount(spaceId: ObjectId): Promise<number> {
  const db = await getDb();
  const likeCount = await db
    .collection<SpaceLike>(COLLECTION)
    .countDocuments({ spaceId });
  await db
    .collection(SPACES_COLLECTION)
    .updateOne({ _id: spaceId }, { $set: { likeCount, updatedAt: new Date() } });
  return likeCount;
}

/**
 * Sets the like state for a consumer/space pair. Returns the new state and
 * the resulting like count for the space.
 */
export async function setSpaceLike(
  consumerId: string | ObjectId,
  spaceId: string | ObjectId,
  liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  await ensureSpaceLikeIndexes();

  const cid = toObjectId(consumerId);
  const sid = toObjectId(spaceId);
  const db = await getDb();

  if (liked) {
    await db.collection<SpaceLike>(COLLECTION).updateOne(
      { consumerId: cid, spaceId: sid },
      { $setOnInsert: { consumerId: cid, spaceId: sid, createdAt: new Date() } },
      { upsert: true },
    );
  } else {
    await db.collection<SpaceLike>(COLLECTION).deleteOne({ consumerId: cid, spaceId: sid });
  }

  const likeCount = await recomputeSpaceLikeCount(sid);
  return { liked, likeCount };
}
