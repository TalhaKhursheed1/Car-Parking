'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchPublicSpace,
  fetchPublicSpaces,
  fetchRecommendedPublicSpaces,
  PublicSpace,
  PublicSpaceDetail,
  PublicSpacesQueryParams,
} from './api';

const PUBLIC_SPACES_QUERY_KEY = ['public-spaces'];
const PUBLIC_RECOMMENDED_QUERY_KEY = ['public-recommended-spaces'];
const publicSpaceKey = (spaceId: string) => ['public-space', spaceId];

export function usePublicSpaces(filters?: PublicSpacesQueryParams) {
  return useQuery<PublicSpace[]>({
    queryKey: [...PUBLIC_SPACES_QUERY_KEY, filters ?? {}],
    queryFn: async () => {
      const response = await fetchPublicSpaces(filters);
      return response.spaces;
    },
    staleTime: 1000 * 60, // 1 minute cache for guests
  });
}

export function useRecommendedPublicSpaces(limit?: number) {
  return useQuery<PublicSpace[]>({
    queryKey: [...PUBLIC_RECOMMENDED_QUERY_KEY, limit ?? null],
    queryFn: async () => {
      const response = await fetchRecommendedPublicSpaces(limit);
      return response.spaces;
    },
    staleTime: 1000 * 60,
  });
}

export function usePublicSpace(spaceId?: string) {
  return useQuery<PublicSpaceDetail>({
    queryKey: publicSpaceKey(spaceId ?? 'new'),
    queryFn: async () => {
      const response = await fetchPublicSpace(spaceId as string);
      return response.space;
    },
    enabled: Boolean(spaceId),
    retry: false,
  });
}

export type { PublicSpace, PublicSpaceDetail };
