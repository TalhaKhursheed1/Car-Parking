'use client';

import { apiFetch } from '@/lib/api-client';

export type AdminMetricsResponse = {
  range: { from: string | null; to: string | null };
  users: { consumer: number; provider: number; admin: number; total: number };
  spaces: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    archived: number;
    active: number;
    recommended: number;
  };
  bookings: {
    inRange: {
      pendingPayment: number;
      confirmed: number;
      cancelled: number;
      total: number;
    };
    conversionRate: number | null;
  };
  revenueInRange: {
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
    bookings: number;
  };
  revenueAllTime: {
    platformCommissionAud: number;
    confirmedBookings: number;
  };
  reviews: {
    totalReviews: number;
    averageRating: number;
    reviewedSpaces: number;
  };
  likes: { totalLikes: number; uniqueLikers: number };
  topSpaces: Array<{
    spaceId: string;
    title: string;
    city: string | null;
    state: string | null;
    bookings: number;
    grossAud: number;
  }>;
  topProviders: Array<{
    providerId: string;
    fullName: string;
    email: string;
    bookings: number;
    grossAud: number;
    netAud: number;
  }>;
};

export async function fetchAdminMetrics(params: { from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const q = search.toString();
  return apiFetch<AdminMetricsResponse>(`/api/admin/metrics${q ? `?${q}` : ''}`);
}
