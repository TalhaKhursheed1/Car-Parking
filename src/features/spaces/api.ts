'use client';

import { apiFetch } from '@/lib/api-client';

export type PublicSpace = {
  id: string;
  title: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  amenities: string[];
  description?: string;
  providerBadge?: string | null;
  ratingAverage: number;
  ratingCount: number;
  likeCount: number;
  isRecommended?: boolean;
  recommendedAt?: string | null;
  createdAt: string;
  images: string[];
};

export type PublicSpaceDetail = PublicSpace & {
  state?: string;
  zipCode?: string;
  dailyRate?: number | null;
  capacity?: number | null;
  availabilityType: '24_7' | 'custom' | 'business_hours';
  customAvailability: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  updatedAt: string;
};

type PublicSpacesResponse = {
  spaces: PublicSpace[];
};

type PublicSpaceResponse = {
  space: PublicSpaceDetail;
};

export type PublicSpacesQueryParams = {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  availabilityType?: '24_7' | 'custom' | 'business_hours';
  day?: string;
  startTime?: string;
  endTime?: string;
};

function buildQueryString(params?: PublicSpacesQueryParams) {
  if (!params) return '';
  const searchParams = new URLSearchParams();

  if (params.city) searchParams.set('city', params.city);
  if (params.state) searchParams.set('state', params.state);
  if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.availabilityType) searchParams.set('availabilityType', params.availabilityType);
  if (params.day) searchParams.set('day', params.day);
  if (params.startTime) searchParams.set('startTime', params.startTime);
  if (params.endTime) searchParams.set('endTime', params.endTime);

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function fetchPublicSpaces(params?: PublicSpacesQueryParams) {
  const query = buildQueryString(params);
  return apiFetch<PublicSpacesResponse>(`/api/spaces/public${query}`);
}

export function fetchPublicSpace(spaceId: string) {
  return apiFetch<PublicSpaceResponse>(`/api/spaces/${spaceId}`);
}

export function fetchRecommendedPublicSpaces(limit?: number) {
  const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiFetch<PublicSpacesResponse>(`/api/spaces/public/recommended${query}`);
}
