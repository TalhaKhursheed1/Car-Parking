import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  listSpacesForRatingReview,
  type AdminRatedSpaceFilters,
} from '@/lib/repositories/spaces';
import { findUsersByIds } from '@/lib/repositories/users';
import {
  rankSpacesByRating,
  type RatingRankOptions,
} from '@/lib/recommendations/spaceRanking';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function requireAdminSession(request: Request):
  | { adminId: ObjectId }
  | NextResponse<{ error: string }> {
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

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function GET(request: Request) {
  const auth = requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const params = url.searchParams;

  const filters: AdminRatedSpaceFilters = {
    city: params.get('city')?.trim() || undefined,
    state: params.get('state')?.trim() || undefined,
    minReviews: parsePositiveInt(params.get('minReviews'), 1, 100),
    isRecommended:
      params.get('isRecommended') === 'true'
        ? true
        : params.get('isRecommended') === 'false'
          ? false
          : undefined,
  };

  const limit = parsePositiveInt(params.get('limit'), 50, 200);
  const rankOptions: RatingRankOptions = {
    minReviews: filters.minReviews,
    priorWeight: parsePositiveInt(params.get('priorWeight'), 5, 50),
  };

  try {
    const spaces = await listSpacesForRatingReview(filters);
    const ranked = rankSpacesByRating(
      spaces.map((space) => ({
        ...space,
        id: space._id.toString(),
        ratingAverage: space.ratingAverage ?? 0,
        ratingCount: space.ratingCount ?? 0,
      })),
      rankOptions,
    ).slice(0, limit);

    const providerIds = [
      ...new Set(ranked.map(({ space }) => space.providerId.toString())),
    ].map((id) => new ObjectId(id));
    const providers = await findUsersByIds(providerIds);
    const providerById = new Map(
      providers.map((u) => [
        u._id!.toString(),
        { id: u._id!.toString(), fullName: u.fullName, email: u.email },
      ]),
    );

    const data = ranked.map(({ space, weightedRating }) => ({
      space: {
        id: space._id?.toString() ?? '',
        title: space.title,
        city: space.city ?? null,
        state: space.state ?? null,
        hourlyRate: space.hourlyRate,
        currency: space.currency,
        ratingAverage: space.ratingAverage ?? 0,
        ratingCount: space.ratingCount ?? 0,
        likeCount: space.likeCount ?? 0,
        isRecommended: space.isRecommended ?? false,
        recommendedAt: space.recommendedAt ? space.recommendedAt.toISOString() : null,
        status: space.status,
        isActive: space.isActive,
        updatedAt: space.updatedAt.toISOString(),
      },
      weightedRating,
      provider: providerById.get(space.providerId.toString()) ?? null,
    }));

    return NextResponse.json({
      data,
      summary: {
        candidates: spaces.length,
        ranked: ranked.length,
        recommendedCount: spaces.filter((s) => s.isRecommended).length,
      },
    });
  } catch (error) {
    console.error('Failed to load admin recommendations', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
