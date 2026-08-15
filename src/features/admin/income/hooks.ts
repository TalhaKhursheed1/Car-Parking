'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminActiveBookingsSummary, fetchAdminIncome, fetchAdminPlatformIncomeSummary } from './api';

const INCOME_QUERY_KEY = (from?: string, to?: string) => ['admin', 'income', from ?? '', to ?? ''] as const;

export function useAdminIncome(from?: string, to?: string) {
  return useQuery({
    queryKey: INCOME_QUERY_KEY(from, to),
    queryFn: () => fetchAdminIncome({ from, to }),
    retry: false,
  });
}

export function useAdminPlatformIncomeSummary() {
  return useQuery({
    queryKey: ['admin', 'stats', 'platform-income'] as const,
    queryFn: fetchAdminPlatformIncomeSummary,
    retry: false,
  });
}

export function useAdminActiveBookingsSummary() {
  return useQuery({
    queryKey: ['admin', 'stats', 'active-bookings'] as const,
    queryFn: fetchAdminActiveBookingsSummary,
    retry: false,
    refetchInterval: 60_000,
  });
}
