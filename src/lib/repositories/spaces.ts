import { Filter, ObjectId, WithId } from 'mongodb';

import { getDb } from '@/lib/db';
import { findProviderIdsByQuery } from '@/lib/repositories/users';

export type SpaceStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type AvailabilityType = '24_7' | 'custom' | 'business_hours';

export interface Space {
  _id?: ObjectId;
  providerId: ObjectId;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  capacity?: number;
  amenities?: string[];
  images?: string[];
  providerBadge?: string;
  availabilityType: AvailabilityType;
  customAvailability?: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  isActive: boolean;
  status: SpaceStatus;
  verificationNotes?: string | null;
  approvedAt?: Date | null;
  approvedBy?: ObjectId | null;
  ratingAverage?: number;
  ratingCount?: number;
  likeCount?: number;
  /** Curated flag set by an admin to surface high-rated spaces to consumers. */
  isRecommended?: boolean;
  recommendedAt?: Date | null;
  recommendedBy?: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'spaces';

export type PublicSpaceFilters = {
  city?: string;
  state?: string;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  availabilityType?: AvailabilityType;
  day?: string;
  startTime?: string;
  endTime?: string;
};

export type AdminSpaceFilters = {
  status?: SpaceStatus;
  city?: string;
  state?: string;
  isActive?: boolean;
  search?: string;
  providerQuery?: string;
  page?: number;
  pageSize?: number;
};

export async function ensureSpaceIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection<Space>(COLLECTION).createIndexes([
    { key: { providerId: 1 }, name: 'provider_idx' },
    { key: { status: 1 }, name: 'status_idx' },
    { key: { isActive: 1 }, name: 'active_idx' },
    { key: { city: 1 }, name: 'city_idx' },
    { key: { coordinates: '2dsphere' }, name: 'coordinates_2dsphere' },
    {
      key: { isRecommended: 1, recommendedAt: -1 },
      name: 'recommended_idx',
      sparse: true,
    },
    { key: { ratingAverage: -1, ratingCount: -1 }, name: 'rating_idx' },
  ]);
}

export async function createSpace(space: Omit<Space, '_id' | 'createdAt' | 'updatedAt' | 'approvedAt' | 'approvedBy'>): Promise<WithId<Space>> {
  const db = await getDb();
  const now = new Date();
  const doc: Space = {
    ...space,
    currency: space.currency || 'AUD',
    amenities: space.amenities || [],
    images: space.images || [],
    customAvailability: space.customAvailability || [],
    ratingAverage: space.ratingAverage ?? 0,
    ratingCount: space.ratingCount ?? 0,
    likeCount: space.likeCount ?? 0,
    isRecommended: space.isRecommended ?? false,
    recommendedAt: space.recommendedAt ?? null,
    recommendedBy: space.recommendedBy ?? null,
    approvedAt: space.status === 'approved' ? now : null,
    approvedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Space>(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function listSpacesByProvider(providerId: ObjectId): Promise<WithId<Space>[]> {
  const db = await getDb();
  return db
    .collection<Space>(COLLECTION)
    .find({ providerId })
    .sort({ createdAt: -1 })
    .toArray();
}

/** Approved spaces that are toggled on for public booking (live listings). */
export async function countActiveApprovedSpacesByProvider(providerId: ObjectId): Promise<number> {
  const db = await getDb();
  return db.collection<Space>(COLLECTION).countDocuments({
    providerId,
    status: 'approved',
    isActive: true,
  });
}

export async function listSpacesByStatus(status: SpaceStatus): Promise<WithId<Space>[]> {
  const db = await getDb();
  return db.collection<Space>(COLLECTION).find({ status }).sort({ createdAt: 1 }).toArray();
}

export async function listPublicSpaces(filters: PublicSpaceFilters = {}): Promise<WithId<Space>[]> {
  const db = await getDb();
  const query: Filter<Space> = {
    status: 'approved',
    isActive: true,
  };

  if (filters.city) {
    query.city = { $regex: new RegExp(filters.city, 'i') };
  }

  if (filters.state) {
    query.state = { $regex: new RegExp(filters.state, 'i') };
  }

  if (filters.minHourlyRate !== undefined || filters.maxHourlyRate !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (filters.minHourlyRate !== undefined) {
      priceFilter.$gte = filters.minHourlyRate;
    }
    if (filters.maxHourlyRate !== undefined) {
      priceFilter.$lte = filters.maxHourlyRate;
    }
    query.hourlyRate = priceFilter as Filter<Space>['hourlyRate'];
  }

  if (filters.availabilityType) {
    query.availabilityType = filters.availabilityType;
  }

  if (filters.day && filters.startTime && filters.endTime) {
    query.availabilityType = 'custom';
    query.customAvailability = {
      $elemMatch: {
        day: filters.day,
        startTime: { $lte: filters.startTime },
        endTime: { $gte: filters.endTime },
      },
    };
  }

  return db
    .collection<Space>(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}

export async function listSpacesForAdmin(filters: AdminSpaceFilters = {}): Promise<{ spaces: WithId<Space>[]; total: number }> {
  const db = await getDb();
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const query: Filter<Space> = {};

  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = { $in: ['approved', 'archived'] };
  }

  if (filters.city) {
    query.city = { $regex: new RegExp(filters.city, 'i') };
  }

  if (filters.state) {
    query.state = { $regex: new RegExp(filters.state, 'i') };
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: regex }, { description: regex }];
  }

  if (filters.providerQuery) {
    const providerIds = await findProviderIdsByQuery(filters.providerQuery);
    if (providerIds.length === 0) {
      return { spaces: [], total: 0 };
    }
    query.providerId = { $in: providerIds };
  }

  const collection = db.collection<Space>(COLLECTION);
  const [spaces, total] = await Promise.all([
    collection.find(query).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments(query),
  ]);

  return { spaces, total };
}

export async function findSpaceById(spaceId: string): Promise<WithId<Space> | null> {
  const db = await getDb();
  return db.collection<Space>(COLLECTION).findOne({ _id: new ObjectId(spaceId) });
}

export async function findSpacesByIds(ids: ObjectId[]): Promise<WithId<Space>[]> {
  if (ids.length === 0) {
    return [];
  }
  const db = await getDb();
  return db.collection<Space>(COLLECTION).find({ _id: { $in: ids } }).toArray();
}

export async function findPublicSpaceById(spaceId: string): Promise<WithId<Space> | null> {
  const db = await getDb();
  return db
    .collection<Space>(COLLECTION)
    .findOne({ _id: new ObjectId(spaceId), status: 'approved', isActive: true });
}

export type AdminRatedSpaceFilters = {
  city?: string;
  state?: string;
  minReviews?: number;
  isRecommended?: boolean;
  /** When true, include archived/inactive listings too (admin lens). */
  includeInactive?: boolean;
};

/**
 * Lists spaces eligible for the admin "recommend by rating" view.
 * Defaults to approved + active listings; sorting/weighting is done by
 * the ranking helper, this only narrows the candidate set.
 */
export async function listSpacesForRatingReview(
  filters: AdminRatedSpaceFilters = {},
): Promise<WithId<Space>[]> {
  const db = await getDb();
  const query: Filter<Space> = {};

  if (!filters.includeInactive) {
    query.status = 'approved';
    query.isActive = true;
  }
  if (filters.city) {
    query.city = { $regex: new RegExp(filters.city, 'i') };
  }
  if (filters.state) {
    query.state = { $regex: new RegExp(filters.state, 'i') };
  }
  if (filters.minReviews !== undefined && filters.minReviews > 0) {
    query.ratingCount = { $gte: filters.minReviews };
  } else {
    query.ratingCount = { $gt: 0 };
  }
  if (filters.isRecommended !== undefined) {
    query.isRecommended = filters.isRecommended;
  }

  return db
    .collection<Space>(COLLECTION)
    .find(query)
    .sort({ ratingAverage: -1, ratingCount: -1 })
    .limit(500)
    .toArray();
}

/**
 * Returns spaces currently flagged as admin-recommended, ordered by
 * most-recently recommended. Used by the public "recommended" carousel.
 */
export async function listRecommendedPublicSpaces(limit = 12): Promise<WithId<Space>[]> {
  const db = await getDb();
  const cap = Math.min(Math.max(limit, 1), 50);
  return db
    .collection<Space>(COLLECTION)
    .find({
      status: 'approved',
      isActive: true,
      isRecommended: true,
    })
    .sort({ recommendedAt: -1, ratingAverage: -1 })
    .limit(cap)
    .toArray();
}

export async function setSpaceRecommended(
  spaceId: string,
  recommended: boolean,
  adminId: ObjectId,
): Promise<WithId<Space> | null> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(spaceId);
  } catch {
    return null;
  }
  const db = await getDb();
  const now = new Date();
  const update = recommended
    ? {
        $set: {
          isRecommended: true,
          recommendedAt: now,
          recommendedBy: adminId,
          updatedAt: now,
        },
      }
    : {
        $set: {
          isRecommended: false,
          recommendedAt: null,
          recommendedBy: null,
          updatedAt: now,
        },
      };

  const result = await db
    .collection<Space>(COLLECTION)
    .findOneAndUpdate({ _id: oid }, update, { returnDocument: 'after' });
  return (result as WithId<Space> | null) ?? null;
}

export async function updateSpace(spaceId: string, updates: Partial<Omit<Space, '_id' | 'createdAt'>>): Promise<void> {
  const db = await getDb();
  const updateDoc: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  };

  if (updates.status && updates.status === 'approved') {
    updateDoc.approvedAt = updates.approvedAt ?? new Date();
  }

  if (updates.status && updates.status !== 'approved') {
    updateDoc.approvedAt = null;
    updateDoc.approvedBy = null;
  }

  await db.collection<Space>(COLLECTION).updateOne(
    { _id: new ObjectId(spaceId) },
    { $set: updateDoc },
  );
}
