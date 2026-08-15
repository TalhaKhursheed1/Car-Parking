'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAdminRecommendations,
  setSpaceRecommended,
  type AdminRecommendationsFilters,
  type AdminRecommendationsResponse,
  type SetRecommendedResponse,
} from './api';

export const ADMIN_RECOMMENDATIONS_KEY = ['admin-recommendations'];

export function useAdminRecommendations(filters?: AdminRecommendationsFilters) {
  return useQuery<AdminRecommendationsResponse>({
    queryKey: [...ADMIN_RECOMMENDATIONS_KEY, filters ?? {}],
    queryFn: () => fetchAdminRecommendations(filters),
    staleTime: 1000 * 15,
  });
}

export function useSetSpaceRecommended() {
  const queryClient = useQueryClient();
  return useMutation<
    SetRecommendedResponse,
    Error,
    { spaceId: string; recommended: boolean }
  >({
    mutationFn: ({ spaceId, recommended }) => setSpaceRecommended(spaceId, recommended),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_RECOMMENDATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['public-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['public-recommended-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['public-space', variables.spaceId] });
    },
  });
}
