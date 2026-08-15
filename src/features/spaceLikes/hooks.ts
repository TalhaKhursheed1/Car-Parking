'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchLikedSpaceIds,
  fetchSpaceLikeState,
  setSpaceLikeState,
  type SpaceLikeState,
} from './api';

export const spaceLikeQueryKey = (spaceId: string) => ['space-like', spaceId];
export const LIKED_SPACE_IDS_KEY = ['consumer-liked-space-ids'];

export function useSpaceLike(spaceId: string | undefined, enabled: boolean) {
  return useQuery<SpaceLikeState>({
    queryKey: spaceLikeQueryKey(spaceId ?? 'unknown'),
    queryFn: () => fetchSpaceLikeState(spaceId as string),
    enabled: enabled && Boolean(spaceId),
    staleTime: 1000 * 10,
  });
}

export function useLikedSpaceIds(enabled: boolean) {
  return useQuery<string[]>({
    queryKey: LIKED_SPACE_IDS_KEY,
    queryFn: async () => {
      const res = await fetchLikedSpaceIds();
      return res.spaceIds;
    },
    enabled,
    retry: false,
  });
}

export function useToggleSpaceLike() {
  const queryClient = useQueryClient();
  return useMutation<SpaceLikeState, Error, { spaceId: string; liked?: boolean }>({
    mutationFn: ({ spaceId, liked }) => setSpaceLikeState(spaceId, liked),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<SpaceLikeState>(spaceLikeQueryKey(variables.spaceId), data);
      queryClient.invalidateQueries({ queryKey: LIKED_SPACE_IDS_KEY });
      queryClient.invalidateQueries({ queryKey: ['public-space', variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ['public-spaces'] });
    },
  });
}
