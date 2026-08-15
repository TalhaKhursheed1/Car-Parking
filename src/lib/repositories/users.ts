import { WithId, ObjectId } from "mongodb";
import { getDb } from "../db";

export type UserRole = "admin" | "provider" | "consumer";

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "users";

export async function countUsers(): Promise<number> {
  const db = await getDb();
  return db.collection<User>(COLLECTION).countDocuments({});
}

export async function findUserByEmail(email: string): Promise<WithId<User> | null> {
  const db = await getDb();
  return db.collection<User>(COLLECTION).findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<WithId<User> | null> {
  const db = await getDb();
  return db
    .collection<User>(COLLECTION)
    .findOne({ _id: new ObjectId(id) });
}

export async function findUsersByIds(ids: ObjectId[]): Promise<WithId<User>[]> {
  if (ids.length === 0) {
    return [];
  }
  const db = await getDb();
  return db.collection<User>(COLLECTION).find({ _id: { $in: ids } }).toArray();
}

export async function createUser(user: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<WithId<User>> {
  const db = await getDb();
  const now = new Date();
  const doc: User = {
    ...user,
    email: user.email.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<User>(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateUserPassword(id: ObjectId, passwordHash: string): Promise<void> {
  const db = await getDb();
  await db.collection<User>(COLLECTION).updateOne(
    { _id: id },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
    },
  );
}

export type UpdateUserAccountInput = {
  fullName?: string;
  email?: string;
};

/**
 * Updates the user's full name and/or email. Emails are normalised to
 * lowercase to keep the existing unique index happy. Returns the
 * refreshed user document so the caller can issue a new session.
 */
export async function updateUserAccount(
  id: ObjectId,
  input: UpdateUserAccountInput,
): Promise<WithId<User> | null> {
  const db = await getDb();
  const set: Partial<User> = { updatedAt: new Date() };
  if (input.fullName !== undefined) {
    const trimmed = input.fullName.trim();
    if (trimmed) set.fullName = trimmed;
  }
  if (input.email !== undefined) {
    const normalised = input.email.trim().toLowerCase();
    if (normalised) set.email = normalised;
  }
  await db.collection<User>(COLLECTION).updateOne({ _id: id }, { $set: set });
  return db.collection<User>(COLLECTION).findOne({ _id: id });
}

export async function ensureUserIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<User>(COLLECTION).createIndexes([
    {
      key: { email: 1 },
      name: "email_unique",
      unique: true,
    },
    {
      key: { role: 1 },
      name: "role_idx",
    },
  ]);
}

export async function findProviderIdsByQuery(query: string): Promise<ObjectId[]> {
  const db = await getDb();
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await db
    .collection<User>(COLLECTION)
    .find({
      role: 'provider',
      $or: [{ fullName: regex }, { email: regex }],
    })
    .project<{ _id: ObjectId }>({ _id: 1 })
    .limit(20)
    .toArray();

  return users.map((user) => user._id);
}

