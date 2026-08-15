'use client';

import { apiFetch } from '@/lib/api-client';

export type AdminRatedSpaceProvider = {
  id: string;
  fullName: string;
  email: string;
};

export type AdminRatedSpace = {
  space: {
    id: string;
    title: string;
    city: string | null;
    state: string | null;
    hourlyRate: number;
    currency: string;
    ratingAverage: number;
    ratingCount: number;
    likeCount: number;
    isRecommended: boolean;
    recommendedAt: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    isActive: boolean;
    updatedAt: string;
  };
  weightedRating: number;
  provider: AdminRatedSpaceProvider | null;
};

export type AdminRecommendationsResponse = {
  data: AdminRatedSpace[];
  summary: {
    candidates: number;
    ranked: number;
    recommendedCount: number;
  };
};

export type AdminRecommendationsFilters = {
  city?: string;
  state?: string;
  minReviews?: number;
  isRecommended?: boolean;
  priorWeight?: number;
  limit?: number;
};

function buildQuery(filters?: AdminRecommendationsFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.state) params.set('state', filters.state);
  if (typeof filters.minReviews === 'number') {
    params.set('minReviews', String(filters.minReviews));
  }
  if (typeof filters.isRecommended === 'boolean') {
    params.set('isRecommended', filters.isRecommended ? 'true' : 'false');
  }
  if (typeof filters.priorWeight === 'number') {
    params.set('priorWeight', String(filters.priorWeight));
  }
  if (typeof filters.limit === 'number') {
    params.set('limit', String(filters.limit));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function fetchAdminRecommendations(filters?: AdminRecommendationsFilters) {
  return apiFetch<AdminRecommendationsResponse>(
    `/api/admin/recommendations${buildQuery(filters)}`,
  );
}

export type SetRecommendedResponse = {
  space: {
    id: string;
    isRecommended: boolean;
    recommendedAt: string | null;
  };
};

export function setSpaceRecommended(spaceId: string, recommended: boolean) {
  return apiFetch<SetRecommendedResponse>(
    `/api/admin/recommendations/${encodeURIComponent(spaceId)}`,
    {
      method: 'POST',
      body: { recommended },
    },
  );
}
