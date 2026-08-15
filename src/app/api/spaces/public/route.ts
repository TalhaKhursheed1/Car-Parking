import { NextResponse } from 'next/server';

import { listPublicSpaces, PublicSpaceFilters } from '@/lib/repositories/spaces';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function normalizeDay(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function buildPublicSpaceFilters(searchParams: URLSearchParams): PublicSpaceFilters {
  const city = searchParams.get('city')?.trim();
  const state = searchParams.get('state')?.trim();
  const minHourlyRate = parseNumberParam(searchParams.get('minPrice'));
  const maxHourlyRate = parseNumberParam(searchParams.get('maxPrice'));
  const availabilityType = searchParams.get('availabilityType') as PublicSpaceFilters['availabilityType'];
  const day = normalizeDay(searchParams.get('day'));
  const startTimeRaw = searchParams.get('startTime');
  const endTimeRaw = searchParams.get('endTime');
  const startTime = startTimeRaw && TIME_PATTERN.test(startTimeRaw) ? startTimeRaw : undefined;
  const endTime = endTimeRaw && TIME_PATTERN.test(endTimeRaw) ? endTimeRaw : undefined;

  const filters: PublicSpaceFilters = {};

  if (city) filters.city = city;
  if (state) filters.state = state;
  if (minHourlyRate !== undefined) filters.minHourlyRate = minHourlyRate;
  if (maxHourlyRate !== undefined) filters.maxHourlyRate = maxHourlyRate;
  if (availabilityType && ['24_7', 'custom', 'business_hours'].includes(availabilityType)) {
    filters.availabilityType = availabilityType;
  }

  if (day && startTime && endTime && startTime < endTime) {
    filters.day = day;
    filters.startTime = startTime;
    filters.endTime = endTime;
  }

  return filters;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = buildPublicSpaceFilters(url.searchParams);
    const spaces = await listPublicSpaces(filters);

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
      isRecommended: space.isRecommended ?? false,
      recommendedAt: space.recommendedAt ? space.recommendedAt.toISOString() : null,
      createdAt: space.createdAt.toISOString(),
      images: space.images ?? [],
    }));

    return NextResponse.json({ spaces: payload });
  } catch (error) {
    console.error('Failed to load public spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
