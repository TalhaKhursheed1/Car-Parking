'use client';

import { apiFetch } from '@/lib/api-client';

export type ReviewDto = {
  id: string;
  bookingId: string;
  spaceId: string;
  consumerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SpaceReviewDto = ReviewDto & {
  consumerName: string;
};

export type UpsertReviewPayload = {
  rating: number;
  comment?: string | null;
};

export type MyReviewResponse = {
  eligible: boolean;
  review: ReviewDto | null;
};

type SpaceReviewsResponse = {
  data: SpaceReviewDto[];
};

type UpsertReviewResponse = {
  review: ReviewDto;
  created: boolean;
};

export function fetchSpaceReviews(spaceId: string) {
  return apiFetch<SpaceReviewsResponse>(`/api/spaces/${encodeURIComponent(spaceId)}/reviews`);
}

/** Returns the current consumer's single review for this space (or null). */
export function fetchMySpaceReview(spaceId: string) {
  return apiFetch<MyReviewResponse>(`/api/spaces/${encodeURIComponent(spaceId)}/review/me`);
}

export function upsertSpaceReview(spaceId: string, payload: UpsertReviewPayload) {
  return apiFetch<UpsertReviewResponse>(`/api/spaces/${encodeURIComponent(spaceId)}/review`, {
    method: 'POST',
    body: payload,
  });
}

export function deleteSpaceReview(spaceId: string) {
  return apiFetch<{ success: boolean }>(`/api/spaces/${encodeURIComponent(spaceId)}/review`, {
    method: 'DELETE',
  });
}
