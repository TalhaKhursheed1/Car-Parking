import { NextResponse } from 'next/server';

import { listRecommendedPublicSpaces } from '@/lib/repositories/spaces';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 24) : 12;

  try {
    const spaces = await listRecommendedPublicSpaces(limit);

    const payload = spaces.map((space) => ({
      id: space._id?.toString() ?? '',
      title: space.title,
      address: space.address,
      city: space.city,
      state: space.state,
      zipCode: space.zipCode,
      hourlyRate: space.hourlyRate,
      dailyRate: space.dailyRate,
      currency: space.currency,
      amenities: space.amenities ?? [],
      description: space.description,
      providerBadge: space.providerBadge ?? null,
      ratingAverage: space.ratingAverage ?? 0,
      ratingCount: space.ratingCount ?? 0,
      likeCount: space.likeCount ?? 0,
      isRecommended: true,
      recommendedAt: space.recommendedAt ? space.recommendedAt.toISOString() : null,
      createdAt: space.createdAt.toISOString(),
      images: space.images ?? [],
    }));

    return NextResponse.json({ spaces: payload });
  } catch (error) {
    console.error('Failed to load recommended spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
