'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminMetrics } from './api';

const KEY = (from?: string, to?: string) =>
  ['admin', 'metrics', from ?? '', to ?? ''] as const;

export function useAdminMetrics(from?: string, to?: string) {
  return useQuery({
    queryKey: KEY(from, to),
    queryFn: () => fetchAdminMetrics({ from, to }),
    retry: false,
  });
}
