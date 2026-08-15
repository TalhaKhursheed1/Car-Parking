'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteSpaceReview,
  fetchMySpaceReview,
  fetchSpaceReviews,
  upsertSpaceReview,
  type MyReviewResponse,
  type SpaceReviewDto,
  type UpsertReviewPayload,
} from './api';

export const spaceReviewsQueryKey = (spaceId: string) => ['space-reviews', spaceId];
export const mySpaceReviewQueryKey = (spaceId: string) => ['space-review-me', spaceId];

export function useSpaceReviews(spaceId: string | undefined) {
  return useQuery<SpaceReviewDto[]>({
    queryKey: spaceReviewsQueryKey(spaceId ?? 'unknown'),
    queryFn: async () => {
      const res = await fetchSpaceReviews(spaceId as string);
      return res.data;
    },
    enabled: Boolean(spaceId),
    staleTime: 1000 * 30,
  });
}

/**
 * Current consumer's single review for this space (plus whether they're
 * allowed to write/edit one). Safe to enable for guests too - the API
 * returns `{ eligible: false, review: null }` and the form just hides.
 */
export function useMySpaceReview(spaceId: string | undefined, enabled: boolean) {
  return useQuery<MyReviewResponse>({
    queryKey: mySpaceReviewQueryKey(spaceId ?? 'unknown'),
    queryFn: () => fetchMySpaceReview(spaceId as string),
    enabled: enabled && Boolean(spaceId),
    retry: false,
  });
}

function invalidateAfterReviewChange(
  queryClient: ReturnType<typeof useQueryClient>,
  spaceId: string,
) {
  queryClient.invalidateQueries({ queryKey: mySpaceReviewQueryKey(spaceId) });
  queryClient.invalidateQueries({ queryKey: spaceReviewsQueryKey(spaceId) });
  queryClient.invalidateQueries({ queryKey: ['public-space', spaceId] });
  queryClient.invalidateQueries({ queryKey: ['public-spaces'] });
}

export function useUpsertSpaceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, payload }: { spaceId: string; payload: UpsertReviewPayload }) =>
      upsertSpaceReview(spaceId, payload),
    onSuccess: (_data, variables) => {
      invalidateAfterReviewChange(queryClient, variables.spaceId);
    },
  });
}

export function useDeleteSpaceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId }: { spaceId: string }) => deleteSpaceReview(spaceId),
    onSuccess: (_data, variables) => {
      invalidateAfterReviewChange(queryClient, variables.spaceId);
    },
  });
}
