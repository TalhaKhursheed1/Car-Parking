import { ObjectId, WithId } from 'mongodb';

import { getDb } from '@/lib/db';

export type AdminActivityType =
  | 'user_registered'
  | 'provider_account_created'
  | 'provider_account_approved'
  | 'provider_account_rejected'
  | 'provider_space_created'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_expired'
  | 'space_recommended'
  | 'space_unrecommended';

export interface AdminActivity {
  _id?: ObjectId;
  type: AdminActivityType;
  actorLabel: string;
  actionLabel: string;
  contextLabel?: string | null;
  status?: 'success' | 'warning' | 'error' | 'info';
  entityId?: string | null;
  createdAt: Date;
}

const COLLECTION = 'admin_activities';

export async function ensureAdminActivityIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<AdminActivity>(COLLECTION).createIndexes([
    { key: { createdAt: -1 }, name: 'admin_activities_created' },
    { key: { type: 1, createdAt: -1 }, name: 'admin_activities_type_created' },
  ]);
}

export async function recordAdminActivity(input: {
  type: AdminActivityType;
  actorLabel: string;
  actionLabel: string;
  contextLabel?: string | null;
  status?: 'success' | 'warning' | 'error' | 'info';
  entityId?: string | null;
}): Promise<void> {
  await ensureAdminActivityIndexes();
  const db = await getDb();
  const doc: AdminActivity = {
    type: input.type,
    actorLabel: input.actorLabel.slice(0, 120),
    actionLabel: input.actionLabel.slice(0, 220),
    contextLabel: input.contextLabel?.slice(0, 220) ?? null,
    status: input.status ?? 'info',
    entityId: input.entityId ?? null,
    createdAt: new Date(),
  };
  await db.collection<AdminActivity>(COLLECTION).insertOne(doc);
}

export async function listAdminActivities(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: WithId<AdminActivity>[]; total: number }> {
  await ensureAdminActivityIndexes();
  const db = await getDb();
  const limit = Math.min(Math.max(params?.limit ?? 20, 1), 200);
  const offset = Math.max(params?.offset ?? 0, 0);
  const [rows, total] = await Promise.all([
    db
      .collection<AdminActivity>(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection<AdminActivity>(COLLECTION).countDocuments({}),
  ]);
  return { rows, total };
}
