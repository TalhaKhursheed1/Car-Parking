'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchPendingSpaces,
  fetchAdminSpaceDetail,
  updateSpaceStatus,
  fetchAdminLiveSpaces,
  updateAdminSpace,
  fetchAllSpacesCount,
  PendingSpace,
  UpdateSpaceStatusPayload,
  AdminSpaceDetailResponse,
  AdminLiveSpace,
  AdminLiveSpaceQuery,
  AdminLiveSpacesResponse,
  UpdateAdminSpacePayload,
} from './api';

const PENDING_SPACES_QUERY_KEY = ['admin', 'spaces', 'pending'];
const LIVE_SPACES_QUERY_KEY = (filters: AdminLiveSpaceQuery | undefined) => [
  'admin',
  'spaces',
  'live',
  filters ? JSON.stringify(filters) : 'default',
];
const SPACE_DETAIL_QUERY_KEY = (spaceId: string) => ['admin', 'spaces', 'detail', spaceId];

export function usePendingSpaces() {
  return useQuery({
    queryKey: PENDING_SPACES_QUERY_KEY,
    queryFn: fetchPendingSpaces,
    select: (data) => data.spaces,
    retry: false,
  });
}

export function useUpdateSpaceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSpaceStatusPayload) => updateSpaceStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_SPACES_QUERY_KEY });
    },
  });
}

export function useAdminSpace(spaceId: string) {
  return useQuery({
    queryKey: SPACE_DETAIL_QUERY_KEY(spaceId),
    queryFn: () => fetchAdminSpaceDetail(spaceId),
    enabled: Boolean(spaceId),
  });
}

export function useAdminLiveSpaces(filters?: AdminLiveSpaceQuery) {
  return useQuery<AdminLiveSpacesResponse, Error>({
    queryKey: LIVE_SPACES_QUERY_KEY(filters),
    queryFn: () => fetchAdminLiveSpaces(filters),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminSpace(spaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAdminSpacePayload) => updateAdminSpace(spaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPACE_DETAIL_QUERY_KEY(spaceId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'spaces', 'live'] });
    },
  });
}

export function useAdminSpaceQuickAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, payload }: { spaceId: string; payload: UpdateAdminSpacePayload }) =>
      updateAdminSpace(spaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'spaces', 'live'] });
    },
  });
}

const ALL_SPACES_COUNT_QUERY_KEY = ['admin', 'spaces', 'count'];

export function useAllSpacesCount() {
  return useQuery({
    queryKey: ALL_SPACES_COUNT_QUERY_KEY,
    queryFn: fetchAllSpacesCount,
    retry: false,
  });
}

export type { PendingSpace, AdminSpaceDetailResponse, AdminLiveSpace };
