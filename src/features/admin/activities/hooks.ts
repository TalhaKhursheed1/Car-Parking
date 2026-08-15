'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminActivities } from './api';

export function useAdminActivities(limit = 10, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'activities', limit, offset],
    queryFn: () => fetchAdminActivities({ limit, offset }),
    retry: false,
    refetchInterval: 60_000,
  });
}
