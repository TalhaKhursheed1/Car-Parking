'use client';

import { apiFetch } from '@/lib/api-client';

export type SpaceLikeState = {
  liked: boolean;
  likeCount: number;
};

export function fetchSpaceLikeState(spaceId: string) {
  return apiFetch<SpaceLikeState>(`/api/spaces/${encodeURIComponent(spaceId)}/like`);
}

export function setSpaceLikeState(spaceId: string, liked?: boolean) {
  return apiFetch<SpaceLikeState>(`/api/spaces/${encodeURIComponent(spaceId)}/like`, {
    method: 'POST',
    body: typeof liked === 'boolean' ? { liked } : {},
  });
}

export function fetchLikedSpaceIds() {
  return apiFetch<{ spaceIds: string[] }>('/api/consumer/likes');
}
