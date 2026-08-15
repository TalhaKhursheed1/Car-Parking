import { NextResponse } from 'next/server';

import { findPublicSpaceById } from '@/lib/repositories/spaces';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const space = await findPublicSpaceById(id);

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const payload = {
      id: space._id?.toString() ?? '',
      title: space.title,
      description: space.description ?? '',
      address: space.address,
      city: space.city,
      state: space.state,
      zipCode: space.zipCode,
      hourlyRate: space.hourlyRate,
      dailyRate: space.dailyRate ?? null,
      currency: space.currency,
      capacity: space.capacity ?? null,
      amenities: space.amenities ?? [],
      availabilityType: space.availabilityType,
      customAvailability: space.customAvailability ?? [],
      images: space.images ?? [],
      providerBadge: space.providerBadge ?? null,
      ratingAverage: space.ratingAverage ?? 0,
      ratingCount: space.ratingCount ?? 0,
      likeCount: space.likeCount ?? 0,
      isRecommended: space.isRecommended ?? false,
      recommendedAt: space.recommendedAt ? space.recommendedAt.toISOString() : null,
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    };

    return NextResponse.json({ space: payload });
  } catch (error) {
    console.error(`Failed to load public space ${id}`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


