'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminEarningsReport, type EarningsFilters } from './api';

const KEY = (filters: EarningsFilters) =>
  [
    'admin',
    'earnings',
    filters.groupBy,
    filters.from ?? '',
    filters.to ?? '',
  ] as const;

export function useAdminEarningsReport(filters: EarningsFilters) {
  return useQuery({
    queryKey: KEY(filters),
    queryFn: () => fetchAdminEarningsReport(filters),
    retry: false,
  });
}
