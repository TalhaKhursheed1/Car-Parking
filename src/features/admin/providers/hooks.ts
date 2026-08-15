'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPendingProviders, updateProviderStatus, PendingProvider } from './api';

const PENDING_PROVIDERS_QUERY_KEY = ['admin', 'providers', 'pending'];

export function usePendingProviders() {
  return useQuery<{ providers: PendingProvider[] }, Error>({
    queryKey: PENDING_PROVIDERS_QUERY_KEY,
    queryFn: fetchPendingProviders,
    retry: false,
  });
}

export function useUpdateProviderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProviderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_PROVIDERS_QUERY_KEY });
    },
  });
}
