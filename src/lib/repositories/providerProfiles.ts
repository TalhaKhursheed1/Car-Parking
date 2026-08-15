import { WithId, ObjectId } from "mongodb";
import { getDb } from "../db";

export type ProviderStatus = "pending" | "approved" | "rejected";

export interface ProviderProfile {
  _id?: ObjectId;
  userId: ObjectId;
  businessName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  payoutMethod?: string;
  bankAccountLast4?: string;
  taxId?: string;
  businessType?: "individual" | "company";
  status: ProviderStatus;
  verificationNotes?: string;
  /** Stripe Connect Express account id (acct_…), set when onboarding starts. */
  stripeConnectAccountId?: string | null;
  /** Cached from Stripe `account.updated` (and optional API checks). */
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectDetailsSubmitted?: boolean;
  /** Banking metadata mirrored from Stripe's default external account. */
  stripeBankBrand?: string | null;
  stripeBankLast4?: string | null;
  stripeBankCurrency?: string | null;
  stripeBankCountry?: string | null;
  stripeBankSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "providerProfiles";

export async function findProviderProfileByUserId(userId: ObjectId): Promise<WithId<ProviderProfile> | null> {
  const db = await getDb();
  return db.collection<ProviderProfile>(COLLECTION).findOne({ userId });
}

export async function findProviderProfilesByUserIds(userIds: ObjectId[]): Promise<WithId<ProviderProfile>[]> {
  if (userIds.length === 0) {
    return [];
  }
  const db = await getDb();
  return db.collection<ProviderProfile>(COLLECTION).find({ userId: { $in: userIds } }).toArray();
}

export async function findProviderProfileByStripeConnectAccountId(
  stripeConnectAccountId: string,
): Promise<WithId<ProviderProfile> | null> {
  const db = await getDb();
  return db.collection<ProviderProfile>(COLLECTION).findOne({ stripeConnectAccountId });
}

export async function listProviderProfilesByStatus(status: ProviderStatus): Promise<WithId<ProviderProfile>[]> {
  const db = await getDb();
  return db.collection<ProviderProfile>(COLLECTION).find({ status }).sort({ createdAt: 1 }).toArray();
}

export async function createProviderProfile(profile: Omit<ProviderProfile, "_id" | "createdAt" | "updatedAt">): Promise<WithId<ProviderProfile>> {
  const db = await getDb();
  const now = new Date();
  const doc: ProviderProfile = {
    ...profile,
    status: profile.status ?? "pending",
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<ProviderProfile>(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateProviderProfile(
  userId: ObjectId,
  updates: Partial<Omit<ProviderProfile, "_id" | "userId" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const db = await getDb();
  await db.collection<ProviderProfile>(COLLECTION).updateOne(
    { userId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
  );
}

export async function ensureProviderProfileIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<ProviderProfile>(COLLECTION).createIndexes([
    {
      key: { userId: 1 },
      name: "userId_unique",
      unique: true,
    },
    {
      key: { status: 1 },
      name: "status_idx",
    },
    {
      key: { stripeConnectAccountId: 1 },
      name: "stripe_connect_account",
      sparse: true,
    },
  ]);
}

